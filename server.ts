import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Helper to sleep
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Helper for strict per-call timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg = "Tempo limite excedido"): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function isQuotaExhausted(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  const msg = (err.message || "").toLowerCase();
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit")
  );
}

function isTransientError(err: any): boolean {
  if (!err) return false;
  if (isQuotaExhausted(err)) return false; // Never retry on exhausted quota
  const status = err.status || err.code || err.statusCode;
  const msg = (err.message || "").toLowerCase();
  return (
    status === 503 ||
    msg.includes("503") ||
    msg.includes("timeout") ||
    msg.includes("high demand") ||
    msg.includes("unavailable")
  );
}

// Helper to sanitize numeric values from AI extraction
function sanitizeNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof val === "string") {
    let cleaned = val.replace(/[^\d.,-]/g, "").trim();
    if (!cleaned) return null;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      const lastComma = cleaned.lastIndexOf(",");
      const lastDot = cleaned.lastIndexOf(".");
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(",", ".");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

function sanitizeExtractedBill(data: any): any {
  if (!data || typeof data !== "object") return data;
  const sanitized = { ...data };

  sanitized.consumo_kwh = sanitizeNumber(sanitized.consumo_kwh);
  sanitized.consumo_medio_12m_kwh = sanitizeNumber(sanitized.consumo_medio_12m_kwh);
  sanitized.valor_total = sanitizeNumber(sanitized.valor_total);
  sanitized.valor_bandeira = sanitizeNumber(sanitized.valor_bandeira);
  sanitized.tarifa_te = sanitizeNumber(sanitized.tarifa_te);
  sanitized.tarifa_tusd = sanitizeNumber(sanitized.tarifa_tusd);
  sanitized.cosip = sanitizeNumber(sanitized.cosip);

  if (sanitized.impostos && typeof sanitized.impostos === "object") {
    sanitized.impostos = {
      icms: sanitizeNumber(sanitized.impostos.icms),
      pis_cofins: sanitizeNumber(sanitized.impostos.pis_cofins),
    };
  } else {
    sanitized.impostos = { icms: null, pis_cofins: null };
  }

  if (sanitized.geracao_distribuida && typeof sanitized.geracao_distribuida === "object") {
    sanitized.geracao_distribuida = {
      energia_injetada_kwh: sanitizeNumber(sanitized.geracao_distribuida.energia_injetada_kwh),
      creditos_acumulados_kwh: sanitizeNumber(sanitized.geracao_distribuida.creditos_acumulados_kwh),
    };
  } else {
    sanitized.geracao_distribuida = null;
  }

  if (typeof sanitized.bandeira === "string") {
    const b = sanitized.bandeira.toLowerCase();
    if (b.includes("verde")) sanitized.bandeira = "verde";
    else if (b.includes("amarel")) sanitized.bandeira = "amarela";
    else if (b.includes("vermelha") && (b.includes("2") || b.includes("ii") || b.includes("dois"))) sanitized.bandeira = "vermelha_2";
    else if (b.includes("vermelha")) sanitized.bandeira = "vermelha_1";
    else sanitized.bandeira = null;
  }

  sanitized.tarifa_social_identificada = Boolean(sanitized.tarifa_social_identificada);
  if (!Array.isArray(sanitized.alertas)) sanitized.alertas = [];
  if (!Array.isArray(sanitized.campos_baixa_confianca)) sanitized.campos_baixa_confianca = [];
  if (!Array.isArray(sanitized.historico_consumo)) sanitized.historico_consumo = [];

  return sanitized;
}

// Response Schema for structured JSON generation
const billResponseSchema = {
  type: Type.OBJECT,
  properties: {
    distribuidora: { type: Type.STRING },
    unidade_consumidora: { type: Type.STRING },
    mes_referencia: { type: Type.STRING },
    vencimento: { type: Type.STRING },
    consumo_kwh: { type: Type.NUMBER },
    consumo_medio_12m_kwh: { type: Type.NUMBER },
    valor_total: { type: Type.NUMBER },
    bandeira: { type: Type.STRING },
    valor_bandeira: { type: Type.NUMBER },
    tarifa_te: { type: Type.NUMBER },
    tarifa_tusd: { type: Type.NUMBER },
    impostos: {
      type: Type.OBJECT,
      properties: {
        icms: { type: Type.NUMBER },
        pis_cofins: { type: Type.NUMBER },
      },
    },
    cosip: { type: Type.NUMBER },
    tarifa_social_identificada: { type: Type.BOOLEAN },
    geracao_distribuida: {
      type: Type.OBJECT,
      properties: {
        energia_injetada_kwh: { type: Type.NUMBER },
        creditos_acumulados_kwh: { type: Type.NUMBER },
      },
    },
    alertas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    campos_baixa_confianca: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    historico_consumo: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          mes: { type: Type.STRING },
          kwh: { type: Type.NUMBER },
        },
      },
    },
    classe_consumo: { type: Type.STRING },
    tipo_ligacao: { type: Type.STRING },
  },
};

// Gemini OCR / Bill Scan endpoint
app.post("/api/scan-bill", async (req, res) => {
  console.log("[server] Received /api/scan-bill request:", {
    hasBase64: !!req.body?.base64,
    hasRawText: !!req.body?.rawText,
    mimeType: req.body?.mimeType,
    fileName: req.body?.fileName
  });
  try {
    const { base64, mimeType, rawText, fileName } = req.body;

    // If client supplied raw text or no image base64, respond with error if both absent
    if (!base64 && !rawText) {
      res.status(400).json({ error: "Nenhum arquivo ou texto foi fornecido para análise." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && (base64 || rawText)) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const prompt = `Você é um auditor especialista e perito em conferência e extração de faturas de energia elétrica do Brasil (Enel, Neoenergia, CPFL, Cemig, Copel, Equatorial, Celesc, Energisa, Light, EDP, RGE, Elektro, etc.).
Analise a fatura de energia fornecida e extraia com RIGOR ABSOLUTO os dados.

DIRETRIZES DE EXTRAÇÃO PARA FATURAS BRASILEIRAS:
1. 'consumo_kwh':
   - Localize o consumo faturado em kWh do mês/ciclo.
   - Pode aparecer rotulado como: 'Consumo Faturado', 'Consumo (kWh)', 'Consumo Ativo', 'Energia Elétrica kWh', 'Energia Ativa kWh', 'Qtd kWh', 'Consumo do Mês', 'Consumo Medido', ou no demonstrativo de cálculo onde a quantidade em kWh é multiplicada pelas tarifas (TE/TUSD).
   - NUNCA confunda com: número do medidor, leitura atual cumulativa física do relógio (número alto de 5 dígitos), nem com histórico de médias.
2. 'valor_total':
   - Valor monetário total a pagar em Reais (R$).
   - Localize no campo 'Total a Pagar', 'Valor Total', 'Valor da Fatura', ou no código de barras / canhoto de quitação.
   - NUNCA confunda com limites de tensão nominal (127V ou 220V) nem com parcelas isoladas de ICMS.
3. 'mes_referencia': Mês e ano de referência da conta (ex: "08/2026", "Agosto/2026", "11/2024").
4. 'vencimento': Data limite de pagamento (formato DD/MM/AAAA).
5. 'distribuidora': Concessionária distribuidora (ex: Enel, Cemig, CPFL, Neoenergia, Copel, Light, Equatorial, Celesc, Energisa, etc.).
6. 'unidade_consumidora': Código da Unidade Consumidora (UC), Conta Contrato ou Código do Cliente.
7. 'tarifa_te': Tarifa de Energia em R$/kWh (ex: 0.35 a 0.55).
8. 'tarifa_tusd': Tarifa de Uso do Sistema em R$/kWh (ex: 0.35 a 0.65).
9. 'bandeira': Bandeira tarifária do mês: "verde", "amarela", "vermelha_1", "vermelha_2", ou null.
10. 'valor_bandeira': Adicional monetário cobrado pela bandeira em R$, se houver.
11. 'impostos': { icms: valor em R$ ou null, pis_cofins: valor em R$ ou null }.
12. 'cosip': Contribuição de iluminação pública municipal (CIP/COSIP) em R$ ou null.
13. 'tarifa_social_identificada': true somente se a fatura contiver termos como 'Tarifa Social', 'Baixa Renda', 'TSEE' ou desconto social. Caso contrário false.
14. 'geracao_distribuida': { energia_injetada_kwh: número ou null, creditos_acumulados_kwh: número ou null } se houver sistema solar ou créditos.
15. 'alertas': lista de avisos úteis identificados (ex: "Bandeira amarela aplicada", "Consumo acima da média").
16. 'campos_baixa_confianca': lista de campos que eventualmente estavam ilegíveis.`;

        // Build parts for multimodal or text input
        const parts: any[] = [];
        if (base64) {
          const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
          let effectiveMime = (mimeType || "").toLowerCase().trim();
          
          if (!effectiveMime || effectiveMime === "application/octet-stream" || effectiveMime === "image/jpg") {
            effectiveMime = "image/jpeg";
          }
          if (fileName?.toLowerCase().endsWith(".pdf") || base64.startsWith("data:application/pdf") || cleanBase64.startsWith("JVBERi0")) {
            effectiveMime = "application/pdf";
          } else if (fileName?.toLowerCase().endsWith(".png") || base64.startsWith("data:image/png") || cleanBase64.startsWith("iVBORw0KGgo")) {
            effectiveMime = "image/png";
          } else if (fileName?.toLowerCase().endsWith(".webp") || base64.startsWith("data:image/webp")) {
            effectiveMime = "image/webp";
          } else if (!effectiveMime.startsWith("image/") && effectiveMime !== "application/pdf") {
            effectiveMime = "image/jpeg";
          }

          parts.push({
            inlineData: {
              mimeType: effectiveMime,
              data: cleanBase64,
            },
          });
        }
        if (rawText) {
          parts.push({
            text: `Texto da fatura:\n${rawText}`,
          });
        }
        parts.push({ text: prompt });

        // Fast, high-quota lite models first for instant 1-2s response, with resilient fallbacks
        const modelsToTry = [
          "gemini-3.5-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.8-flash",
        ];
        let parsedData: any = null;
        const PER_MODEL_TIMEOUT_MS = 12000;

        for (const model of modelsToTry) {
          let modelSucceeded = false;
          const maxRetries = 1;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const response = await withTimeout(
                ai.models.generateContent({
                  model,
                  contents: parts,
                  config: {
                    responseMimeType: "application/json",
                    responseSchema: billResponseSchema,
                    maxOutputTokens: 4096,
                  },
                }),
                PER_MODEL_TIMEOUT_MS,
                `Timeout no modelo ${model}`
              );

              const contentText = response.text || "";

              if (!contentText.trim()) {
                break;
              }

              // Parse guaranteed JSON from structured response
              try {
                const rawObj = JSON.parse(contentText.trim());
                if (rawObj && typeof rawObj === "object") {
                  parsedData = sanitizeExtractedBill(rawObj);
                  modelSucceeded = true;
                  break;
                }
              } catch (parseErr) {
                // In case of outer wrapper, try regex extraction
                const jsonMatch = contentText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const rawObj = JSON.parse(jsonMatch[0]);
                  if (rawObj && typeof rawObj === "object") {
                    parsedData = sanitizeExtractedBill(rawObj);
                    modelSucceeded = true;
                    break;
                  }
                }
                break;
              }
            } catch (modelErr: any) {
              if (isQuotaExhausted(modelErr)) {
                console.log(`[server] Quota atingida em ${model}, tentando próximo...`);
                break;
              }
              if (isTransientError(modelErr) && attempt < maxRetries) {
                await sleep(500);
                continue;
              }
              break;
            }
          }

          if (modelSucceeded && parsedData) {
            break;
          }
        }

        if (parsedData) {
          res.json({
            source: "gemini_vision",
            bill: parsedData,
            success: true,
          });
          return;
        }
      } catch (geminiError) {
        console.log("[server] OCR via IA indisponível, ativando fallback.");
      }
    }

    // Fallback response for offline or when Gemini key is not provided
    res.json({
      source: "client_fallback",
      message: "Análise por IA indisponível ou em modo offline. Use o extrator determinístico local ou preenchimento manual.",
      success: false,
    });
  } catch (error) {
    console.error("[server] Erro no processamento de fatura:", error);
    res.status(500).json({ error: "Falha ao processar arquivo da conta de energia." });
  }
});

// Interactive Educational AI Assistant Endpoint
app.post("/api/assistant", async (req, res) => {
  try {
    const { messages, userContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Nenhuma mensagem fornecida." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({
        error: "Chave da API Gemini não configurada no servidor. Por favor, configure a variável GEMINI_API_KEY.",
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const textVolume = userContext?.textVolume || "alto";
    const simpleLanguage = userContext?.simpleLanguage || false;
    let volumeInstruction = "\n8. VOLUME E LINGUAGEM:";
    if (textVolume === "alto") {
      volumeInstruction += " (Tamanho: LONGO) Priorize explicações completas, estruturadas, detalhadas e profundas. Não seja resumido demais.";
    } else if (textVolume === "baixo") {
      volumeInstruction += " (Tamanho: CURTO) Seja ultra-resumido, direto ao ponto em bullet points.";
    } else {
      volumeInstruction += " (Tamanho: MÉDIO) Equilibre detalhes técnicos e concisão.";
    }
    
    if (simpleLanguage) {
      volumeInstruction += " (Linguagem: SIMPLES) O usuário prefere explicações muito cotidianas. Mude todo o jargão técnico para analogias do dia a dia da vida real. Fale como se estivesse explicando para uma pessoa querida que quer apenas economizar.";
    } else {
      volumeInstruction += " (Linguagem: NORMAL) Use o tom técnico e pedagógico adequado para conceitos de energia, física e eletricidade.";
    }

    // Build context snippet from active user data in Turn OFF
    let contextSnippet = `\n\n9. DADOS REAIS DO USUÁRIO NESTE MOMENTO NO APP (USE COM PRIORIDADE SE RELEVANTE):
- Tela atual aberta: "${userContext?.currentTab || 'home'}"`;

    if (userContext?.activeDiagnosisSummary) {
      const d = userContext.activeDiagnosisSummary;
      contextSnippet += `\n- Diagnóstico Residencial Ativo:
  * Consumo mensal calculado: ${d.totalKwh} kWh/mês (Aprox. R$ ${Number(d.totalCost || 0).toFixed(2)})
  * Índice de Eficiência Energética: ${d.efficiencyScore}/100
  * Maior consumidor identificado: ${d.topAppliance || 'Não identificado'}
  * Total de aparelhos cadastrados: ${d.appliancesCount || 0}
  * Potencial de economia mensal identificado: R$ ${Number(d.potentialSavingsBrl || 0).toFixed(2)}`;
    }

    if (userContext?.activeBillSummary) {
      const b = userContext.activeBillSummary;
      contextSnippet += `\n- Fatura de Energia Cadastrada:
  * Distribuidora: ${b.distributor || 'Não identificada'}
  * Consumo faturado: ${b.kwh} kWh
  * Valor total da conta: R$ ${Number(b.totalBrl || 0).toFixed(2)}
  * Bandeira tarifária: ${b.flag || 'Não informada'}
  * Tarifa Social identificada na conta: ${b.isSocial ? 'Sim' : 'Não'}`;
    }

    const systemInstruction = `Você é a "IA Explicativa do Turn OFF", uma inteligência artificial especialista, didática, amigável e de alta precisão técnica em Eficiência Energética Residencial, Tarifas de Energia no Brasil (Aneel/TSEE) e Segurança Elétrica Doméstica (NBR 5410).
O aplicativo "Turn OFF" foi criado pelos estudantes do GT-02 de Sistemas de Energia Renovável da EEEP Dom Walfrido Teixeira Vieira.

SUAS DIRETRIZES FUNDAMENTAIS DE RESPOSTA:
1. Responda com atenção estrita à pergunta específica do usuário. Não forneça respostas genéricas desconectadas do assunto perguntado.
2. FORMATAÇÃO E TEXTO LIMPO:
   - NUNCA use sintaxe LaTeX como "$$", "\\frac", "\\times" ou "\\text".
   - NUNCA use asteriscos repetidos ou caracteres colados como "**".
   - Sempre escreva fórmulas matemáticas de forma limpa, direta e visualmente agradável:
     Consumo Mensal (kWh) = (Potência em Watts × Horas/dia × Dias/mês) ÷ 1000
   - Ao fazer cálculos de exemplo ou solicitados pelo usuário, mostre passo a passo simples com números claros e resultados objetivos.
3. CONEXÃO INTERATIVA COM OS MÓDULOS DO TURN OFF:
   - Sempre que recomendar uma ferramenta do app, inclua o código de navegação interativo especial entre colchetes [Aba: id_da_aba]. A interface do aplicativo transformará essa marcação em um botão clicável para o usuário ir direto até a tela indicada!
   - As abas disponíveis são:
     * [Aba: scanner] - Leitor de Contas (extração de kWh, bandeiras e tarifas da fatura)
     * [Aba: diagnosis] - Diagnóstico Residencial (mapeamento completo dos aparelhos)
     * [Aba: simulator] - Simulador de Hábitos "E se..." (projeção de economia com novos hábitos)
     * [Aba: payback] - Simulador de Payback / Equipamentos (comparação de aparelhos antigos vs novos A+++)
     * [Aba: safety] - Segurança Elétrica Residencial (norma NBR 5410, disjuntores, fiação e choques)
     * [Aba: learn] - Guia Educativo (cálculos de física, relógios medidores e glossário elétrico)
     * [Aba: tarifa-social] - Tarifa Social de Energia Elétrica (simulador de descontos CadÚnico/BPC)
     * [Aba: history] - Histórico (evolução dos diagnósticos e contas passadas)
4. RESPOSTAS PERSONALIZADAS:
   - Se o usuário perguntar quanto gasta, onde está o maior desperdício ou como economizar, consulte os dados do Diagnóstico e da Fatura informados no contexto.
5. SEGURANÇA ELÉTRICA EM PRIMEIRO LUGAR (NBR 5410):
   - Economizar energia NUNCA deve colocar a vida em risco. Condene terminantemente gambiarras, emendas soltas, fios desencapados e desarmes forçados de disjuntores.
6. FÍSICA E ENGENHARIA CORRETA:
   - Aparelhos térmicos puros (chuveiro elétrico, torneira elétrica, ferro, secador) são os mais potentes (de 1.000W a 7.500W).
   - Aparelhos com compressor (geladeiras, ar-condicionado) operam em ciclos (fator de uso de ~40% a 60%).
   - Aparelhos com tecnologia Inverter não desligam abruptamente o motor, variando a rotação e economizando até 40% a 60%.
   - Modo Stand-by (consumo fantasma): aparelhos em espera continuam consumindo de 1W a 25W (receptores, TVs, micro-ondas, carregadores na tomada).
7. TARIFA SOCIAL (TSEE) & BANDEIRAS:
   - Explique a gratuidade governamental de até 80 kWh e faixas de desconto para inscritos no CadÚnico e BPC.
   - Explique o impacto das bandeiras tarifárias Aneel (Verde, Amarela, Vermelha Patamar 1 e 2).` + volumeInstruction + contextSnippet;

    // Convert messages to Gemini contents format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Fast, responsive models with high availability
    const modelsToTry = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ];
    let reply: string | null = null;
    let usedModel: string = "gemini-3.5-flash-lite";

    for (const model of modelsToTry) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          }),
          15000,
          `Timeout de 15s excedido para ${model}`
        );

        const text = response.text?.trim() || "";
        if (text) {
          reply = text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.log(`[server] Modelo ${model} indisponível (${err.status || err.message?.slice(0, 60)}), tentando próximo candidato...`);
        continue;
      }
    }

    if (reply) {
      res.json({ reply, model: usedModel });
      return;
    }

    res.status(503).json({
      error: "O serviço de inteligência artificial está temporariamente inacessível. Por favor, tente novamente em alguns instantes.",
    });
  } catch (error: any) {
    console.error("[server] Erro no assistente:", error);
    res.status(500).json({
      error: "Houve uma falha ao consultar a inteligência artificial. Por favor, tente novamente.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
