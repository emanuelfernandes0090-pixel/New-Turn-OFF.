import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Save,
  Zap,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ArrowLeft,
  Share2,
  Edit3,
  WifiOff,
  HardDrive,
  Eye,
  X,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  Flame,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ExtractedBill, AccessibilitySettings, BillScanRecord } from "../types";
import {
  parseBillText,
  calculateBillCoherence,
  parseNumberBR,
  getBillDecomposition,
  getApplianceImpactWithRate,
  getTarifaSocialPotentialSavings,
  getAneelFlagRatePerKwh,
} from "../lib/bill-parser";
import { loadBillScans } from "../lib/storage";
import { formatBRL, formatNumber } from "../lib/energy";

interface BillScannerProps {
  initialBillRecord?: BillScanRecord | ExtractedBill | null;
  onSaveBill: (bill: ExtractedBill) => void;
  onUseInDiagnosis: (bill: ExtractedBill) => void;
  onShareBill?: (bill: ExtractedBill) => void;
  settings: AccessibilitySettings;
}

export const BillScanner: React.FC<BillScannerProps> = ({
  initialBillRecord,
  onSaveBill,
  onUseInDiagnosis,
  onShareBill,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "text">(
    "upload",
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanFailed, setScanFailed] = useState<boolean>(false);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [extractedBill, setExtractedBill] = useState<ExtractedBill | null>(() => {
    if (initialBillRecord) {
      return "bill" in initialBillRecord ? initialBillRecord.bill : initialBillRecord;
    }
    return null;
  });

  useEffect(() => {
    if (initialBillRecord) {
      const b = "bill" in initialBillRecord ? initialBillRecord.bill : initialBillRecord;
      setExtractedBill(b);
      setScanFailed(false);
      setScanError(null);
    }
  }, [initialBillRecord]);
  const [rawTextInput, setRawTextInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [explanatoryTopic, setExplanatoryTopic] = useState<{
    title: string;
    description: string;
    example?: string;
    tip?: string;
  } | null>(null);
  const [showOriginalDocModal, setShowOriginalDocModal] = useState(false);
  const [showApplianceCostDetails, setShowApplianceCostDetails] = useState(false);
  const [historyScans, setHistoryScans] = useState<BillScanRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const scans = loadBillScans();
      setHistoryScans(scans);
    } catch (e) {
      console.warn("Erro ao carregar histórico de faturas:", e);
    }
  }, []);

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const TARIFF_EXPLANATIONS: Record<
    string,
    { title: string; description: string; example?: string; tip?: string }
  > = {
    consumo: {
      title: "Consumo Faturado (kWh)",
      description:
        "É a quantidade real de energia elétrica que a sua residência utilizou durante o ciclo de faturamento (geralmente entre 28 e 32 dias). O valor é obtido subtraindo a leitura atual do medidor pela leitura do mês anterior.",
      example:
        "Exemplo: Se o medidor marcava 14.500 no mês passado e agora marca 14.700, seu consumo faturado foi de 200 kWh.",
      tip: 'Confira se o número no seu relógio medidor hoje é maior ou igual ao registrado como "Leitura Atual" na conta.',
    },
    valor_total: {
      title: "Valor Total a Pagar (R$)",
      description:
        "É a soma de todos os custos: consumo de energia (TE + TUSD), adicionais de bandeiras tarifárias, impostos estaduais (ICMS) e federais (PIS/COFINS), além da taxa municipal de iluminação pública (COSIP).",
      tip: "Compare sempre o valor total com o consumo em kWh para saber se o aumento da conta foi por consumo de aparelhos ou por mudança de bandeira tarifária.",
    },
    te: {
      title: "TE - Tarifa de Energia",
      description:
        "Remunera a geração de eletricidade nas usinas hidrelétricas, solares, eólicas e termelétricas. É o preço da energia puramente dita, sem considerar os postes e fios que a transportam.",
      example: "Em média no Brasil, varia entre R$ 0,30 e R$ 0,55 por kWh.",
      tip: "Economizar no tempo do chuveiro ou na temperatura do ar-condicionado reduz diretamente o valor cobrado na TE.",
    },
    tusd: {
      title: "TUSD - Tarifa de Uso do Sistema de Distribuição",
      description:
        "Paga a infraestrutura das distribuidoras de energia (ex: Enel, Equatorial, Cemig). Cobre os postes, fiação nas ruas, transformadores, subestações e as equipes de emergência 24h.",
      example: "Em média, varia entre R$ 0,35 e R$ 0,60 por kWh.",
      tip: "A TUSD é cobrada proporcionalmente à energia que você consome. Quanto menos kWh sua casa puxa da rede, menor o valor de TUSD.",
    },
    bandeira: {
      title: "Bandeiras Tarifárias (ANEEL)",
      description:
        "Sistema criado pela ANEEL para repassar aos consumidores o custo extra de gerar energia nos meses de seca, quando é necessário ligar usinas termelétricas a óleo e gás.",
      example:
        "• Verde: Sem custo extra.\n• Amarela: Pequeno acréscimo.\n• Vermelha Patamar 1 e 2: Custos mais altos a cada 100 kWh consumidos.",
      tip: "Em meses de Bandeira Vermelha, reduza o tempo de banho e o uso de ferro elétrico para evitar surpresas no fim do mês.",
    },
    icms: {
      title: "ICMS (Imposto Estadual)",
      description:
        "Imposto sobre Circulação de Mercadorias e Serviços, arrecadado pelo Governo do seu Estado. Incide sobre a energia, o transporte e as bandeiras tarifárias.",
      tip: "Cada estado possui sua própria alíquota residencial (geralmente entre 17% e 20%).",
    },
    piscofins: {
      title: "PIS e COFINS (Tributos Federais)",
      description:
        "Contribuições sociais arrecadadas pela União Federal (Governo Federal) destinadas ao financiamento da seguridade social, saúde pública e previdência.",
      tip: "Suas alíquotas variam todo mês na conta de acordo com os créditos das distribuidoras.",
    },
    cosip: {
      title: "COSIP / CIP (Iluminação Pública)",
      description:
        "Contribuição para Custeio do Serviço de Iluminação Pública. É repassada integralmente para a Prefeitura Municipal da sua cidade para trocar lâmpadas de postes e iluminar praças e vias públicas.",
      tip: "O valor é fixado por lei municipal da sua cidade, e não pela distribuidora de energia.",
    },
    uc: {
      title: "Unidade Consumidora (UC / Instalação)",
      description:
        'É o número de identificação exclusivo da sua casa ou apartamento perante a concessionária de energia. É como se fosse o "CPF" do seu relógio medidor.',
      tip: "Tenha esse número em mãos sempre que for ligar para a distribuidora para pedir atendimento, solicitar religação ou cadastrar a Tarifa Social.",
    },
    tsee: {
      title: "Tarifa Social de Energia Elétrica (TSEE)",
      description:
        "Programa do Governo Federal que concede descontos expressivos na conta de luz para famílias de baixa renda inscritas no Cadastro Único (CadÚnico) com renda por pessoa de até meio salário mínimo.",
      example:
        "Garante gratuidade ou descontos de até 100% da parcela de consumo nos primeiros 80 kWh/mês.",
      tip: 'Consulte a aba "Tarifa Social" no aplicativo para simular exatamente quanto você pode economizar e ver como solicitar.',
    },
  };

  const [scanStepMessage, setScanStepMessage] = useState<string>(
    "Preparando imagem com alta nitidez e contraste...",
  );

  useEffect(() => {
    if (!isScanning) return;
    const steps = [
      "Preparando imagem com alta nitidez e contraste...",
      "Identificando distribuidora, código da instalação e datas...",
      "Extraindo consumo faturado em kWh e tarifas TE/TUSD...",
      "Conferindo bandeira tarifária ANEEL, tributos e encargos...",
      "Verificando consistência matemática dos valores...",
    ];
    let idx = 0;
    setScanStepMessage(steps[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setScanStepMessage(steps[idx]);
    }, 2400);
    return () => clearInterval(timer);
  }, [isScanning]);

  const hasEssentialBillData = (
    b: Partial<ExtractedBill> | null | undefined,
  ): boolean => {
    if (!b) return false;
    const kwh =
      typeof b.consumo_kwh === "number" && !isNaN(b.consumo_kwh)
        ? b.consumo_kwh
        : parseNumberBR(b.consumo_kwh as any);
    const valor =
      typeof b.valor_total === "number" && !isNaN(b.valor_total)
        ? b.valor_total
        : parseNumberBR(b.valor_total as any);
    const hasKwh = typeof kwh === "number" && kwh > 0;
    const hasValor = typeof valor === "number" && valor > 0;
    const hasMes =
      typeof b.mes_referencia === "string" &&
      b.mes_referencia.trim().length > 0;
    const hasDist =
      typeof b.distribuidora === "string" &&
      b.distribuidora.trim().length > 0;
    const hasUc =
      typeof b.unidade_consumidora === "string" &&
      b.unidade_consumidora.trim().length > 0;
    return hasKwh || hasValor || hasMes || hasDist || hasUc;
  };

  const normalizeExtractedBill = (b: any): ExtractedBill => {
    const parseNum = (v: any) => {
      if (typeof v === "number" && !isNaN(v)) return v;
      if (typeof v === "string") return parseNumberBR(v);
      return null;
    };

    let consumo = parseNum(b.consumo_kwh);
    let valor = parseNum(b.valor_total);
    const te = parseNum(b.tarifa_te);
    const tusd = parseNum(b.tarifa_tusd);
    const camposBaixa = Array.isArray(b.campos_baixa_confianca) ? [...b.campos_baixa_confianca] : [];

    // Heurística de alta resiliência: se o consumo ou valor não foram lidos mas o outro foi, deriva estimativa para conferência
    if (consumo === null && valor !== null && valor > 0) {
      const rate = (te && tusd && (te + tusd) > 0) ? (te + tusd) : 0.88;
      consumo = Math.round(valor / rate);
      camposBaixa.push("Consumo em kWh estimado a partir do valor total (confirme com a fatura)");
    } else if (valor === null && consumo !== null && consumo > 0) {
      const rate = (te && tusd && (te + tusd) > 0) ? (te + tusd) : 0.88;
      valor = Math.round(consumo * rate * 100) / 100;
      camposBaixa.push("Valor total em R$ estimado a partir do consumo (confirme com a fatura)");
    }

    return {
      distribuidora: b.distribuidora || null,
      unidade_consumidora: b.unidade_consumidora || null,
      mes_referencia: b.mes_referencia || null,
      vencimento: b.vencimento || null,
      consumo_kwh: consumo,
      consumo_medio_12m_kwh: parseNum(b.consumo_medio_12m_kwh),
      variacao_consumo_percentual: parseNum(b.variacao_consumo_percentual),
      bandeira: b.bandeira || "verde",
      valor_bandeira: parseNum(b.valor_bandeira),
      tarifa_te: te,
      tarifa_tusd: tusd,
      cosip: parseNum(b.cosip),
      valor_total: valor,
      geracao_distribuida: b.geracao_distribuida
        ? {
            energia_injetada_kwh: parseNum(b.geracao_distribuida.energia_injetada_kwh),
            creditos_acumulados_kwh: parseNum(b.geracao_distribuida.creditos_acumulados_kwh),
          }
        : null,
      tarifa_social_identificada: Boolean(b.tarifa_social_identificada),
      alertas: Array.isArray(b.alertas) ? b.alertas : [],
      campos_baixa_confianca: camposBaixa,
      impostos: {
        icms: parseNum(b.impostos?.icms),
        pis_cofins: parseNum(b.impostos?.pis_cofins),
      },
      quality: camposBaixa.length === 0 ? "boa" : "revisar",
      qualityMessage:
        camposBaixa.length === 0
          ? "Leitura realizada com sucesso via IA. Revise os valores antes de salvar."
          : `Alguns campos foram sinalizados para conferência: ${camposBaixa.join(", ")}.`,
    };
  };

  const prepareFileForScan = async (
    file: File,
  ): Promise<{ base64: string; mimeType: string }> => {
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf";
    if (isPdf) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            base64: reader.result as string,
            mimeType: "application/pdf",
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Suporta qualquer imagem mantendo proporção e nitidez profissional
    if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|heic|heif)$/i.test(file.name)) {
      return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxDim = 2400; // Resolução ampliada para não perder caracteres e dígitos de tabelas
          let { width, height } = img;

          // Se a imagem já estiver dentro do limite de resolução e tamanho moderado, envie o arquivo original sem recodificação lossy
          if (file.size <= 3.5 * 1024 * 1024 && width <= maxDim && height <= maxDim) {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                base64: reader.result as string,
                mimeType: file.type || "image/jpeg",
              });
            reader.readAsDataURL(file);
            return;
          }

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.94);
            resolve({
              base64: compressed,
              mimeType: "image/jpeg",
            });
            return;
          }
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              base64: reader.result as string,
              mimeType: file.type || "image/jpeg",
            });
          reader.readAsDataURL(file);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              base64: reader.result as string,
              mimeType: file.type?.startsWith("image/") ? file.type : "image/jpeg",
            });
          reader.readAsDataURL(file);
        };
        img.src = objectUrl;
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          base64: reader.result as string,
          mimeType: file.type || "image/jpeg",
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleStartManualInput = () => {
    setScanFailed(false);
    setScanError(null);
    setIsManualInput(true);
    setExtractedBill({
      distribuidora: "",
      unidade_consumidora: "",
      mes_referencia: "",
      vencimento: "",
      consumo_kwh: null,
      consumo_medio_12m_kwh: null,
      variacao_consumo_percentual: null,
      bandeira: "verde",
      valor_bandeira: null,
      tarifa_te: null,
      tarifa_tusd: null,
      cosip: null,
      valor_total: null,
      geracao_distribuida: null,
      tarifa_social_identificada: false,
      impostos: {
        icms: null,
        pis_cofins: null,
      },
      alertas: [],
      campos_baixa_confianca: [],
      quality: "revisar",
      qualityMessage:
        "Preenchimento manual dos dados da fatura. Digite as informações da sua conta de luz para análise.",
    });
  };

  // Process selected file
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setScanError(
        "O arquivo é maior que 12 MB. Por favor selecione uma imagem ou PDF de menor tamanho.",
      );
      setScanFailed(false);
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanFailed(false);
    setIsManualInput(false);

    // 1. Processamento local direto para arquivos textuais (funciona offline e online)
    const isTextFile =
      file.type.includes("text") ||
      file.type.includes("json") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    if (isTextFile) {
      try {
        const text = await file.text();
        const localParsed = parseBillText(text, file.name);
        if (hasEssentialBillData(localParsed)) {
          setExtractedBill({
            ...localParsed,
            sourceUrl: URL.createObjectURL(file),
            quality: "boa",
            qualityMessage:
              "Dados da conta extraídos com sucesso localmente. Revise os valores antes de salvar no histórico.",
          });
          setIsScanning(false);
          setScanFailed(false);
          return;
        }
      } catch (textErr) {
        console.warn("[BillScanner] Leitura local de texto falhou:", textErr);
      }
    }

    // 2. Se o dispositivo estiver offline, a visão computacional na nuvem não está disponível
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsScanning(false);
      setScanFailed(true);
      setScanError(
        "Modo Offline: A análise automática de imagem requer conexão com a internet. Você pode continuar usando o leitor preenchendo os dados manualmente ou colando o texto da fatura — os cálculos e o histórico funcionam 100% no seu dispositivo.",
      );
      return;
    }

    try {
      const { base64: base64Data, mimeType: effectiveMime } =
        await prepareFileForScan(file);

      // Try AI scanning via /api/scan-bill
      try {
        const response = await fetch("/api/scan-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: base64Data,
            mimeType: effectiveMime,
            fileName: file.name,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.bill) {
            const normalized = normalizeExtractedBill(data.bill);
            const bill: ExtractedBill = {
              ...normalized,
              sourceUrl: URL.createObjectURL(file),
            };
            setExtractedBill(bill);
            setIsScanning(false);
            setScanFailed(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn(
          "[BillScanner] Backend AI scanner falhou ou indisponível:",
          apiErr,
        );
      }

      // If AI or OCR could not extract essential data, keep the user on upload screen with clear options
      setExtractedBill(null);
      setScanFailed(true);
      setIsScanning(false);
    } catch (err) {
      setScanError("Erro ao preparar o arquivo da conta para envio.");
      setScanFailed(true);
      setIsScanning(false);
    }
  };

  const handleTextScan = () => {
    if (!rawTextInput.trim()) {
      setScanError("Cole o texto da sua conta de energia antes de analisar.");
      return;
    }

    setScanError(null);
    setScanFailed(false);
    setIsScanning(true);

    try {
      const bill = parseBillText(rawTextInput, "local://texto-colado");
      if (hasEssentialBillData(bill)) {
        setExtractedBill(bill);
        setScanFailed(false);
        setIsManualInput(false);
      } else {
        setExtractedBill(null);
        setScanFailed(true);
      }
    } catch (err) {
      setScanFailed(true);
      setExtractedBill(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedBill, value: unknown) => {
    if (!extractedBill) return;
    setExtractedBill({
      ...extractedBill,
      [field]: value,
    });
  };

  const handleImpostosChange = (
    field: "icms" | "pis_cofins",
    val: number | null,
  ) => {
    if (!extractedBill) return;
    setExtractedBill({
      ...extractedBill,
      impostos: {
        ...extractedBill.impostos,
        [field]: val,
      },
    });
  };

  const coherence = extractedBill
    ? calculateBillCoherence(extractedBill)
    : null;

  const decomposition = extractedBill
    ? getBillDecomposition(extractedBill)
    : null;

  const applianceCosts = decomposition
    ? getApplianceImpactWithRate(decomposition.effectiveRateKwh)
    : [];

  const tarifaSocialOportunidade =
    extractedBill &&
    !extractedBill.tarifa_social_identificada &&
    extractedBill.consumo_kwh
      ? getTarifaSocialPotentialSavings(
          extractedBill.consumo_kwh,
          extractedBill.valor_total || 0,
        )
      : null;

  // Find most recent previous bill from another reference month for comparison
  const lastPreviousBill = historyScans.find(
    (h) =>
      h.bill &&
      h.bill.consumo_kwh &&
      h.bill.valor_total &&
      h.bill.mes_referencia !== extractedBill?.mes_referencia,
  );

  const billComparison =
    extractedBill &&
    lastPreviousBill &&
    extractedBill.consumo_kwh &&
    lastPreviousBill.bill.consumo_kwh
      ? {
          kwhDiff:
            extractedBill.consumo_kwh - lastPreviousBill.bill.consumo_kwh,
          kwhPercent: Math.round(
            ((extractedBill.consumo_kwh -
              lastPreviousBill.bill.consumo_kwh) /
              lastPreviousBill.bill.consumo_kwh) *
              100,
          ),
          valDiff:
            (extractedBill.valor_total || 0) -
            (lastPreviousBill.bill.valor_total || 0),
          valPercent: lastPreviousBill.bill.valor_total
            ? Math.round(
                (((extractedBill.valor_total || 0) -
                  lastPreviousBill.bill.valor_total) /
                  lastPreviousBill.bill.valor_total) *
                  100,
              )
            : 0,
          previousMonth:
            lastPreviousBill.bill.mes_referencia || "mês anterior",
        }
      : null;

  return (
    <div
      id="bill-scanner-view"
      className="space-y-8 animate-in fade-in duration-300"
    >
      {/* Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-800">
          <FileText className="w-3.5 h-3.5" />
          Leitor Inteligente de Faturas
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
          Leitura & Conferência Consciente da Conta
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          {settings.simpleLanguage
            ? "Envie uma foto ou PDF da sua conta de energia. O aplicativo confere os números e você pode corrigir qualquer valor antes de salvar."
            : "Auditoria completa: extrai consumo faturado (kWh), valor total (R$), tarifas TE/TUSD, encargos, bandeira e identifica se há Tarifa Social ou Geração Solar. "}
        </p>
      </div>

      {/* Input Mode Selector */}
      {!extractedBill && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* Offline local helper badge */}
          {isOffline && (
            <div
              id="scanner-offline-indicator"
              className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                  <WifiOff className="w-4 h-4" />
                </div>
                <p className="leading-relaxed">
                  <strong className="font-bold">Modo Offline no Leitor:</strong> As conferências, cálculos de tarifas e histórico funcionam 100% no seu aparelho. Suas contas salvas serão sincronizadas na nuvem assim que você se reconectar.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-center">
                <button
                  type="button"
                  onClick={handleStartManualInput}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Digitar dados
                </button>
              </div>
            </div>
          )}

          <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3 gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "upload" as const, label: "Foto ou PDF", icon: Upload },
              { id: "text" as const, label: "Colar Texto OCR", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-scanner-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setScanError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? "bg-orange-600 text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Upload (File / Drag & Drop / Camera) */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                id="dropzone-bill"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 ${
                  dragOver
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50/50 dark:bg-slate-800/30"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base sm:text-lg">
                    Clique para escolher a conta ou arraste o arquivo aqui
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formatos suportados: Imagens (JPG, PNG, WebP) ou PDF digital
                    (até 12 MB)
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    Foto nítida
                  </span>
                  <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-orange-600" />
                    PDF da distribuidora
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Text Paste */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Cole o texto bruto extraído da sua conta (ou de um leitor OCR):
              </label>
              <textarea
                id="textarea-bill-ocr"
                rows={8}
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="Exemplo: ENEL DISTRIBUIÇÃO SP&#10;Consumo faturado: 195 kWh&#10;Total a pagar: R$ 180,45&#10;Vencimento: 20/08/2026&#10;TE: 0,42 TUSD: 0,38"
                className="w-full p-4 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <div className="flex justify-end">
                <button
                  id="btn-analyze-text"
                  onClick={handleTextScan}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Analisar Texto da Fatura
                </button>
              </div>
            </div>
          )}

          {/* Friendly Scan Failure / Offline Notice */}
          {scanFailed && (
            <div
              id="bill-scan-failure-card"
              className="p-5 sm:p-6 rounded-3xl bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-800 shadow-sm space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 shrink-0 mt-0.5">
                  {isOffline ? (
                    <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-orange-900 dark:text-orange-200">
                    {isOffline
                      ? "Modo Offline: Análise de imagem requer internet"
                      : "Não conseguimos ler as informações desta imagem"}
                  </h4>
                  <p className="text-xs text-orange-800/90 dark:text-orange-300/90 leading-relaxed">
                    {isOffline
                      ? "A visão computacional na nuvem precisa de conexão de rede. No entanto, o TurnOFF funciona perfeitamente offline: você pode digitar os dados diretamente ou colar o texto da fatura — todo o cálculo de coerência e o histórico funcionam no seu aparelho e serão sincronizados ao reconectar."
                      : "A imagem pode estar com baixa resolução, cortada, com reflexos ou pouca iluminação. Para uma leitura automática nítida, fotografe a conta aberta, de cima para baixo e com boa luz. Ou se preferir, digite os dados diretamente."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-200 dark:border-orange-900/60">
                <button
                  type="button"
                  id="btn-manual-input-fallback"
                  onClick={handleStartManualInput}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Preencher manualmente {isOffline && "(Offline)"}
                </button>
                <button
                  type="button"
                  id="btn-paste-text-fallback"
                  onClick={() => {
                    setActiveTab("text");
                    setScanFailed(false);
                    setScanError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  Colar texto da conta
                </button>
                {!isOffline && (
                  <button
                    type="button"
                    id="btn-retry-scan-file"
                    onClick={() => {
                      setScanFailed(false);
                      setScanError(null);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tentar outra foto/arquivo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Notice */}
          {scanError && !scanFailed && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="p-6 rounded-3xl bg-orange-50/80 dark:bg-orange-950/40 border-2 border-orange-200 dark:border-orange-800/80 flex flex-col sm:flex-row items-center justify-center gap-3.5 text-center sm:text-left transition-all">
              <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-orange-950 dark:text-orange-100 block">
                  {scanStepMessage}
                </span>
                <span className="text-[11px] text-orange-700/80 dark:text-orange-300/80 font-medium">
                  Auditoria inteligente por IA com conferência matemática de tarifas ANEEL
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted Bill Results & Validation Editor */}
      {extractedBill && (
        <div className="space-y-6">
          {/* Quality & Audit Status Banner */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-3 ${
              isManualInput
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                : extractedBill.quality === "boa"
                  ? "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isManualInput ? (
                  <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : extractedBill.quality === "boa" ? (
                  <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {isManualInput
                    ? "Preenchimento Manual da Fatura de Energia"
                    : extractedBill.quality === "boa"
                      ? "Leitura Concluída com Alta Confiança"
                      : "Revisão e Conferência Recomendada"}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {extractedBill.sourceUrl &&
                  !extractedBill.sourceUrl.startsWith("sample:") &&
                  !extractedBill.sourceUrl.startsWith("local://") && (
                    <button
                      type="button"
                      id="btn-view-original-bill-doc"
                      onClick={() => setShowOriginalDocModal(true)}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver documento original
                    </button>
                  )}
                <button
                  id="btn-scan-another"
                  onClick={() => {
                    setExtractedBill(null);
                    setIsManualInput(false);
                  }}
                  className="self-start sm:self-auto text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-orange-600 underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {isManualInput
                    ? "Voltar ao envio de arquivo"
                    : "Tentar outra foto/arquivo"}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isManualInput
                ? "Digite abaixo os dados da sua conta de luz (consumo kWh, valor total, distribuidora, etc.) para que o Turn OFF calcule suas métricas e audite as tarifas."
                : extractedBill.qualityMessage}
            </p>

            {/* Coherence Feedback */}
            {coherence?.comparable && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  coherence.incoherent
                    ? "bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700"
                    : "bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200"
                }`}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Validação de Coerência: </span>
                  {coherence.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Editable Fields Grid */}
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Campos Reconhecidos da Fatura
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Você pode editar qualquer campo diretamente antes de salvar
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {extractedBill.distribuidora || "Concessionária"}
              </span>
            </div>

            {/* Main Fields: Consumption and Total Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-900 dark:text-orange-200">
                    Consumo Faturado (kWh)*
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExplanatoryTopic(TARIFF_EXPLANATIONS.consumo)
                    }
                    className="p-1 text-orange-700 dark:text-orange-300 hover:bg-orange-200/50 rounded-full transition"
                    title="O que é Consumo Faturado?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  id="input-bill-kwh"
                  type="number"
                  value={extractedBill.consumo_kwh ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "consumo_kwh",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  placeholder="Ex: 180"
                  className="w-full text-xl font-bold bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-orange-300 dark:border-orange-700 text-slate-900 dark:text-white focus:outline-orange-500"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Apenas consumo faturado no mês (não confundir com medidor).
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-900 dark:text-orange-200">
                    Valor Total a Pagar (R$)*
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExplanatoryTopic(TARIFF_EXPLANATIONS.valor_total)
                    }
                    className="p-1 text-orange-700 dark:text-orange-300 hover:bg-orange-200/50 rounded-full transition"
                    title="O que compõe o Valor Total?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  id="input-bill-total"
                  type="number"
                  step="0.01"
                  value={extractedBill.valor_total ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "valor_total",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  placeholder="Ex: 214.50"
                  className="w-full text-xl font-bold bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-orange-300 dark:border-orange-700 text-slate-900 dark:text-white focus:outline-orange-500"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Valor final em dinheiro (nunca tensão 220V).
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {settings.simpleLanguage ? "Dia de Pagar" : "Data de Vencimento"}
                </label>
                <input
                  id="input-bill-vencimento"
                  type="text"
                  value={extractedBill.vencimento ?? ""}
                  onChange={(e) =>
                    handleFieldChange("vencimento", e.target.value || null)
                  }
                  placeholder="DD/MM/AAAA"
                  className="w-full text-sm font-semibold bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-orange-500"
                />
                
                {extractedBill.vencimento && (
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractedBill.lembrete_vencimento || false}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          const { requestNotificationPermission } = await import("../lib/notifications");
                          const granted = await requestNotificationPermission();
                          if (granted) {
                            handleFieldChange("lembrete_vencimento", true);
                          } else {
                            alert("Permissão para notificações não foi concedida.");
                          }
                        } else {
                          handleFieldChange("lembrete_vencimento", false);
                        }
                      }}
                      className="w-4 h-4 mt-0.5 text-orange-600 rounded-md focus:ring-orange-500"
                    />
                    <div className="flex-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      <strong>Lembrar vencimento:</strong> Receba notificações 2 dias antes, 1 dia antes e no dia do vencimento.
                    </div>
                  </label>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {settings.simpleLanguage ? "Mês da Conta" : "Mês de Referência"}
                </label>
                <input
                  id="input-bill-referencia"
                  type="text"
                  value={extractedBill.mes_referencia ?? ""}
                  onChange={(e) =>
                    handleFieldChange("mes_referencia", e.target.value || null)
                  }
                  placeholder="MM/AAAA"
                  className="w-full text-sm font-semibold bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-orange-500"
                />
              </div>
            </div>

            {/* Additional Metadata: Distributor, UC, Flag, Class, Connection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Distribuidora
                </label>
                <input
                  id="input-bill-distribuidora"
                  type="text"
                  value={extractedBill.distribuidora ?? ""}
                  onChange={(e) =>
                    handleFieldChange("distribuidora", e.target.value || null)
                  }
                  placeholder="Ex: Enel, Cemig, CPFL..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Unidade Consumidora (UC)
                  </label>
                  <button
                    type="button"
                    onClick={() => setExplanatoryTopic(TARIFF_EXPLANATIONS.uc)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="O que é Unidade Consumidora?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  id="input-bill-uc"
                  type="text"
                  value={extractedBill.unidade_consumidora ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "unidade_consumidora",
                      e.target.value || null,
                    )
                  }
                  placeholder="Código do cliente"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {settings.simpleLanguage ? "Bandeira (Cor do Mês)" : "Bandeira Tarifária"}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExplanatoryTopic(TARIFF_EXPLANATIONS.bandeira)
                    }
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="O que são Bandeiras Tarifárias?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  id="select-bill-bandeira"
                  value={extractedBill.bandeira ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "bandeira",
                      e.target.value
                        ? (e.target.value as ExtractedBill["bandeira"])
                        : null,
                    )
                  }
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Não identificada</option>
                  <option value="verde">Verde (Sem custo adicional)</option>
                  <option value="amarela">Amarela (Custo moderado)</option>
                  <option value="vermelha_1">
                    Vermelha Patamar 1 (Alto custo)
                  </option>
                  <option value="vermelha_2">
                    Vermelha Patamar 2 (Custo crítico)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Classe de Consumo
                </label>
                <select
                  id="select-bill-classe"
                  value={extractedBill.classe_consumo ?? "Residencial"}
                  onChange={(e) =>
                    handleFieldChange("classe_consumo", e.target.value || null)
                  }
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Residencial">B1 - Residencial</option>
                  <option value="Comercial">B3 - Comercial</option>
                  <option value="Rural">B2 - Rural</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Poder Público">Poder Público</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipo de Ligação
                </label>
                <select
                  id="select-bill-ligacao"
                  value={extractedBill.tipo_ligacao ?? "bifasico"}
                  onChange={(e) =>
                    handleFieldChange("tipo_ligacao", e.target.value || null)
                  }
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="monofasico">Monofásico (1 Fase)</option>
                  <option value="bifasico">Bifásico (2 Fases - Padrão)</option>
                  <option value="trifasico">Trifásico (3 Fases)</option>
                </select>
              </div>
            </div>

            {/* Tariff Breakdown: TE, TUSD, ICMS, PIS/COFINS, COSIP */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Composição Tarifária & Tributos (R$)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clique no{" "}
                  <HelpCircle className="w-3 h-3 inline text-orange-600" /> para
                  ver a explicação de cada item
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      TE (Energia)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanatoryTopic(TARIFF_EXPLANATIONS.te)
                      }
                      className="text-slate-400 hover:text-orange-600"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={extractedBill.tarifa_te ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "tarifa_te",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="R$/kWh"
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      TUSD (Distrib.)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanatoryTopic(TARIFF_EXPLANATIONS.tusd)
                      }
                      className="text-slate-400 hover:text-orange-600"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={extractedBill.tarifa_tusd ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "tarifa_tusd",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="R$/kWh"
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      {settings.simpleLanguage ? "Imposto Estadual" : "ICMS"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanatoryTopic(TARIFF_EXPLANATIONS.icms)
                      }
                      className="text-slate-400 hover:text-orange-600"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedBill.impostos?.icms ?? ""}
                    onChange={(e) =>
                      handleImpostosChange(
                        "icms",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="R$"
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      {settings.simpleLanguage ? "Imposto Federal" : "PIS / COFINS"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanatoryTopic(TARIFF_EXPLANATIONS.piscofins)
                      }
                      className="text-slate-400 hover:text-orange-600"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedBill.impostos?.pis_cofins ?? ""}
                    onChange={(e) =>
                      handleImpostosChange(
                        "pis_cofins",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="R$"
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      {settings.simpleLanguage ? "Iluminação Pública (COSIP)" : "COSIP (Ilum.)"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanatoryTopic(TARIFF_EXPLANATIONS.cosip)
                      }
                      className="text-slate-400 hover:text-orange-600"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedBill.cosip ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "cosip",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="R$"
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Tarifa Social Toggle & GD */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {settings.simpleLanguage ? "Desconto Baixa Renda (Tarifa Social)" : "Tarifa Social / Baixa Renda (TSEE)"}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Benefício federal que concede gratuidade de 100% da parcela
                    de consumo até 80 kWh/mês.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExplanatoryTopic(TARIFF_EXPLANATIONS.tsee)}
                  className="p-1 text-slate-400 hover:text-orange-600"
                  title="O que é Tarifa Social?"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="checkbox-tarifa-social"
                  type="checkbox"
                  checked={extractedBill.tarifa_social_identificada}
                  onChange={(e) =>
                    handleFieldChange(
                      "tarifa_social_identificada",
                      e.target.checked,
                    )
                  }
                  className="w-4 h-4 text-orange-600 rounded-md focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tarifa Social Aplicada
                </span>
              </label>
            </div>

            {/* Raio-X Tarifário & Decomposição da Conta */}
            {decomposition && (
              <div
                id="bill-decomposition-card"
                className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Raio-X Tarifário: Onde Cada Real da Conta é Gasto
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {decomposition.isEstimated
                          ? "Estimativa regulatória transparente baseada nas médias normativas ANEEL"
                          : "Decomposição discriminada a partir das tarifas TE e TUSD da concessionária"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tarifa real efetiva:
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-200 text-xs font-black">
                      {formatBRL(decomposition.effectiveRateKwh)} / kWh
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        decomposition.rateClassification === "economica"
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                          : decomposition.rateClassification === "alta"
                            ? "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {decomposition.rateClassification === "economica"
                        ? "Tarifa Baixa"
                        : decomposition.rateClassification === "alta"
                          ? "Tarifa Alta"
                          : "Média Brasil"}
                    </span>
                  </div>
                </div>

                {/* Proportional Segmented Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700 shadow-inner">
                    <div
                      title={`Geração (TE): ${decomposition.generation.percent}%`}
                      style={{ width: `${decomposition.generation.percent}%` }}
                      className="bg-amber-500 transition-all duration-500"
                    />
                    <div
                      title={`Rede/Distribuição (TUSD): ${decomposition.distribution.percent}%`}
                      style={{ width: `${decomposition.distribution.percent}%` }}
                      className="bg-orange-600 transition-all duration-500"
                    />
                    <div
                      title={`Tributos (ICMS + PIS/COFINS): ${decomposition.taxes.percent}%`}
                      style={{ width: `${decomposition.taxes.percent}%` }}
                      className="bg-slate-500 dark:bg-slate-400 transition-all duration-500"
                    />
                    {decomposition.flag.percent > 0 && (
                      <div
                        title={`Bandeira Tarifária: ${decomposition.flag.percent}%`}
                        style={{ width: `${decomposition.flag.percent}%` }}
                        className="bg-red-500 transition-all duration-500"
                      />
                    )}
                    {decomposition.cosip.percent > 0 && (
                      <div
                        title={`Iluminação Pública (COSIP): ${decomposition.cosip.percent}%`}
                        style={{ width: `${decomposition.cosip.percent}%` }}
                        className="bg-yellow-400 transition-all duration-500"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span>Geração TE ({decomposition.generation.percent}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
                      <span>Fio/Rede TUSD ({decomposition.distribution.percent}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 dark:bg-slate-400 inline-block" />
                      <span>Tributos ({decomposition.taxes.percent}%)</span>
                    </div>
                    {decomposition.flag.value > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                        <span>Bandeira ({decomposition.flag.percent}%)</span>
                      </div>
                    )}
                    {decomposition.cosip.value > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                        <span>COSIP ({decomposition.cosip.percent}%)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Geração (Usinas)
                    </span>
                    <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 block">
                      {formatBRL(decomposition.generation.value)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {decomposition.generation.percent}% da conta
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Postes & Fios (TUSD)
                    </span>
                    <span className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 block">
                      {formatBRL(decomposition.distribution.value)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {decomposition.distribution.percent}% da conta
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tributos (ICMS/PIS)
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 block">
                      {formatBRL(decomposition.taxes.value)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {decomposition.taxes.percent}% da conta
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Bandeira + COSIP
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 block">
                      {formatBRL(
                        decomposition.flag.value + decomposition.cosip.value,
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {decomposition.flag.percent + decomposition.cosip.percent}% da conta
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Comparativo Histórico Inteligente com a Fatura Anterior */}
            {billComparison && (
              <div
                id="bill-history-comparison-card"
                className="p-4 sm:p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-xl ${
                        billComparison.kwhDiff > 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      }`}
                    >
                      {billComparison.kwhDiff > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Comparação Direta com a Fatura Anterior ({billComparison.previousMonth})
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      billComparison.kwhDiff > 0
                        ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200"
                        : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    {billComparison.kwhDiff > 0
                      ? `+${billComparison.kwhPercent}% no consumo`
                      : `${billComparison.kwhPercent}% no consumo`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-0.5">
                    <span className="text-slate-500 dark:text-slate-400">
                      Variação de Consumo Energético
                    </span>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>
                        {billComparison.kwhDiff > 0
                          ? `+${billComparison.kwhDiff} kWh`
                          : `${billComparison.kwhDiff} kWh`}
                      </span>
                      <span className="text-xs font-normal text-slate-500">
                        ({billComparison.kwhDiff > 0 ? "aumento" : "redução"})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-0.5">
                    <span className="text-slate-500 dark:text-slate-400">
                      Variação Financeira na Conta
                    </span>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>
                        {billComparison.valDiff > 0
                          ? `+${formatBRL(billComparison.valDiff)}`
                          : `${formatBRL(billComparison.valDiff)}`}
                      </span>
                      <span className="text-xs font-normal text-slate-500">
                        (
                        {billComparison.valPercent > 0
                          ? `+${billComparison.valPercent}%`
                          : `${billComparison.valPercent}%`}
                        )
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Oportunidade da Tarifa Social (se elegível e não cadastrada) */}
            {tarifaSocialOportunidade && (
              <div
                id="bill-social-opportunity-card"
                className="p-4 sm:p-5 rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-orange-900 dark:text-orange-200">
                        Oportunidade de Economia: Tarifa Social de Energia Elétrica (TSEE)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900/80 text-orange-900 dark:text-orange-100 text-[10px] font-bold">
                        Até {tarifaSocialOportunidade.discountPercentage}% de desconto
                      </span>
                    </div>
                    <p className="text-xs text-orange-800/90 dark:text-orange-300/90 leading-relaxed">
                      Seu consumo de <strong>{extractedBill.consumo_kwh} kWh</strong> está dentro do limite da Tarifa Social (até 220 kWh/mês). Se alguém da sua residência for inscrito no Cadastro Único (CadÚnico) com renda até meio salário mínimo ou receber BPC/LOAS, sua conta poderia cair de <strong>{formatBRL(extractedBill.valor_total || 0)}</strong> para aproximadamente <strong>{formatBRL(tarifaSocialOportunidade.estimatedNewTotal)}</strong>, economizando cerca de <strong>{formatBRL(tarifaSocialOportunidade.estimatedSavingsMonth)}/mês</strong> ({formatBRL(tarifaSocialOportunidade.estimatedSavingsYear)}/ano).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Simulador de Custo Real por Aparelho com a Tarifa da Fatura */}
            {applianceCosts.length > 0 && decomposition && (
              <div
                id="bill-appliance-costs-card"
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div
                  onClick={() => setShowApplianceCostDetails(!showApplianceCostDetails)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Quanto custa cada aparelho com a tarifa desta conta ({formatBRL(decomposition.effectiveRateKwh)}/kWh)?
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Veja o impacto real dos vilões do consumo calculados na sua tarifa
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {showApplianceCostDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {showApplianceCostDetails && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {applianceCosts.map((appliance) => (
                      <div
                        key={appliance.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {appliance.name}
                          </h5>
                          <span className="text-xs font-black text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {formatBRL(appliance.monthlyCost)}/mês
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          {appliance.usageDescription} ({appliance.monthlyKwh} kWh)
                        </p>
                        <div className="pt-1 text-[10px] text-amber-700 dark:text-amber-400 border-t border-slate-200/60 dark:border-slate-700/60 leading-tight">
                          💡 {appliance.tip}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3 sm:justify-end">
              {onShareBill && (
                <button
                  id="btn-share-bill"
                  onClick={() => onShareBill(extractedBill)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Compartilhar / PDF
                </button>
              )}

              <button
                id="btn-save-bill-history"
                onClick={() => onSaveBill(extractedBill)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-orange-600" />
                Salvar no Histórico
              </button>

              <button
                id="btn-use-in-diagnosis"
                onClick={() => onUseInDiagnosis(extractedBill)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current shrink-0" />
                <span>Usar Conta no Diagnóstico</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory Info Modal */}
      {explanatoryTopic && (
        <div
          id="tariff-explanation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  {explanatoryTopic.title}
                </h4>
              </div>
              <button
                onClick={() => setExplanatoryTopic(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanatoryTopic.description}
            </p>

            {explanatoryTopic.example && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line font-medium">
                {explanatoryTopic.example}
              </div>
            )}

            {explanatoryTopic.tip && (
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 text-xs text-orange-800 dark:text-orange-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                <span>
                  <strong>Dica Prática:</strong> {explanatoryTopic.tip}
                </span>
              </div>
            )}

            <button
              onClick={() => setExplanatoryTopic(null)}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
      {/* Modal de Visualização da Fatura Original */}
      {showOriginalDocModal && extractedBill && extractedBill.sourceUrl && (
        <div
          id="modal-original-bill-doc"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Documento Original da Conta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOriginalDocModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[300px]">
              {extractedBill.sourceUrl.startsWith("data:application/pdf") ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-16 h-16 text-orange-600 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Arquivo PDF carregado com sucesso. As informações foram extraídas e auditadas.
                  </p>
                </div>
              ) : (
                <img
                  src={extractedBill.sourceUrl}
                  alt="Fatura de energia original"
                  className="max-h-[70vh] object-contain rounded-xl shadow-md"
                />
              )}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setShowOriginalDocModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
