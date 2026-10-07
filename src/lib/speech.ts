export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string;
}

type SpeechCallback = (state: SpeechState) => void;

class SpeechGuideManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<SpeechCallback> = new Set();
  private state: SpeechState = {
    isSpeaking: false,
    isPaused: false,
    currentText: "",
  };

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  public subscribe(cb: SpeechCallback): () => void {
    this.listeners.add(cb);
    cb({ ...this.state });
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): SpeechState {
    return { ...this.state };
  }

  public speak(
    text: string,
    options: { rate?: number; volume?: number } = {},
  ): void {
    if (!this.synth) return;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = options.rate ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Pick a Portuguese voice if available
    const voices = this.synth.getVoices();
    const ptVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("pt-br") ||
        v.lang.toLowerCase().startsWith("pt"),
    );
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onstart = () => {
      this.state = { isSpeaking: true, isPaused: false, currentText: text };
      this.notify();
    };

    utterance.onend = () => {
      this.state = { isSpeaking: false, isPaused: false, currentText: "" };
      this.currentUtterance = null;
      this.notify();
    };

    utterance.onerror = () => {
      this.state = { isSpeaking: false, isPaused: false, currentText: "" };
      this.currentUtterance = null;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause(): void {
    if (this.synth && this.state.isSpeaking && !this.state.isPaused) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notify();
    }
  }

  public resume(): void {
    if (this.synth && this.state.isSpeaking && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.notify();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.state = { isSpeaking: false, isPaused: false, currentText: "" };
      this.currentUtterance = null;
      this.notify();
    }
  }
}

export const speechManager = new SpeechGuideManager();

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakText(
  text: string,
  settings?: { speechGuide?: { rate?: number; volume?: number } },
  onEnd?: () => void,
): void {
  if (!isSpeechSupported()) return;
  const rate = settings?.speechGuide?.rate ?? 1.0;
  const volume = settings?.speechGuide?.volume ?? 1.0;
  speechManager.speak(text, { rate, volume });
}

export function stopSpeech(): void {
  speechManager.stop();
}

export const TAB_NARRATIONS: Record<
  string,
  { title: string; short: string; detailed: string }
> = {
  inicio: {
    title: "Início",
    short:
      "Painel geral do Turn OFF. Comece pelo Diagnóstico para avaliar sua residência ou faça a Leitura da sua Conta.",
    detailed:
      "Bem-vindo ao Turn OFF, projeto do 3º ano de Sistemas de Energia Renovável da EEEP Dom Walfrido Teixeira Vieira. No painel inicial você encontra seu índice de eficiência energética, acesso direto para novo diagnóstico, leitura de conta com câmera ou arquivo, plano de ação e avisos de segurança elétrica.",
  },
  diagnostico: {
    title: "Diagnóstico Energético",
    short:
      "Mapeie os aparelhos da sua residência, tempo de uso e conheça onde a energia é realmente gasta.",
    detailed:
      "Etapa de Diagnóstico Técnico. O cálculo utiliza fórmulas físicas reais de potência elétrica, horas diárias de uso e fator de utilização por ciclo. Você pode cadastrar potências nominais ou usar as médias de referência. Se houver qualquer sinal de aquecimento de tomadas ou faíscas, a segurança elétrica é priorizada imediatamente.",
  },
  leitor: {
    title: "Leitor de Conta de Energia",
    short:
      "Analise sua fatura por foto, PDF ou preenchimento manual. O sistema confere consumo em kWh, valor total e tarifas.",
    detailed:
      "Leitor de faturas de energia elétrica. O leitor extrai consumo faturado em kWh, valor total a pagar, encargos TE e TUSD, impostos e bandeira tarifária. O sistema possui validação conservadora para nunca confundir tensão como 220V com valores em dinheiro ou consumo. Você sempre pode revisar e corrigir antes de salvar.",
  },
  simulador: {
    title: "Simulação de Hábitos",
    short:
      "Simule cenários de economia sem alterar o diagnóstico original e veja a redução em kWh e em reais.",
    detailed:
      "Simulador interativo de cenários de consumo e hábitos. Teste ações como diminuir 5 minutos de banho no chuveiro elétrico, trocar lâmpadas incandescentes por LED, ou ajustar a temperatura do ar-condicionado para 23 graus. Os cálculos evitam dupla contagem e limitam a economia ao teto físico razoável.",
  },
  plano: {
    title: "Plano de Ação e Metas",
    short:
      "Ações práticas de economia ranqueadas pelo impacto real, com meta mensal de consumo.",
    detailed:
      "Plano de Ação Personalizado. As recomendações priorizam os equipamentos que mais consomem na sua residência. Marque as ações que você colocou em prática e defina sua meta mensal em kWh para acompanhar se o consumo caiu na próxima fatura.",
  },
  beneficios: {
    title: "Tarifa Social e Benefícios",
    short:
      "Descubra se sua família pode ter direito à gratuidade de até 80 kWh na Tarifa Social de Energia Elétrica.",
    detailed:
      "Módulo de Tarifa Social de Energia Elétrica (TSEE). Conforme a regra nacional vigente, beneficiários de programas sociais como CadÚnico e BPC têm gratuidade total da parcela de energia nos primeiros 80 kWh mensais. Responda às perguntas para verificar os critérios e saiba como consultar o CRAS ou sua distribuidora.",
  },
  aprender: {
    title: "Aprender — Segurança e Eficiência",
    short:
      "Conteúdo educativo com ilustrações sobre proteção elétrica, fio terra, disjuntores, DR, etiquetas ENCE e Selo Procel.",
    detailed:
      "Espaço educativo do Turn OFF. Aprenda a diferença entre Watts, quilowatts-hora e reais na conta de luz. Conheça a etiqueta ENCE do Inmetro e o Selo Procel. Na seção de proteção elétrica, veja o funcionamento do fio terra na tomada brasileira NBR 14136, o papel dos disjuntores contra sobrecarga e a proteção do dispositivo DR contra choque elétrico.",
  },
  payback: {
    title: "Simulador de Payback e Viabilidade",
    short:
      "Descubra em quantos meses a troca de um aparelho antigo por um modelo eficiente com Selo Procel A se paga com a economia na conta.",
    detailed:
      "Simulador de Payback Financeiro. Calcule o tempo de retorno do investimento ao substituir aparelhos obsoletos, como refrigeradores antigos ou ar-condicionado tradicional por modelos com compressor Inverter e Selo Procel A+++. Compare o custo inicial com a economia líquida mensal e a projeção acumulada em 5 anos.",
  },
  safety: {
    title: "Segurança Elétrica Residencial",
    short:
      "Aprenda a fazer inspeção visual segura em tomadas, fiações e quadros elétricos, e desmistifique crenças populares perigosas.",
    detailed:
      "Guia de Segurança Elétrica Residencial. A vida e a integridade da sua família vêm antes de qualquer economia. Conheça os 6 sinais críticos de sobrecarga e risco de incêndio, saiba por que nunca aumentar o disjuntor sem trocar a fiação, e entenda como o checklist de segurança do Turn OFF protege seu lar.",
  },
  historico: {
    title: "Histórico e Evolução",
    short:
      "Acompanhe seus diagnósticos anteriores, contas registradas e a evolução do seu consumo ao longo dos meses.",
    detailed:
      "Histórico consolidado de consumo e contas lidas. Compare a evolução mensal em gráficos, avalie se suas metas foram atingidas e consulte diagnósticos de simulação salvos sem risco de alterar os dados reais da sua casa.",
  },
};

// Aliases for English AppTab enum keys
TAB_NARRATIONS.home = TAB_NARRATIONS.inicio;
TAB_NARRATIONS.diagnosis = TAB_NARRATIONS.diagnostico;
TAB_NARRATIONS.scanner = TAB_NARRATIONS.leitor;
TAB_NARRATIONS.simulator = TAB_NARRATIONS.simulador;
TAB_NARRATIONS["tarifa-social"] = TAB_NARRATIONS.beneficios;
TAB_NARRATIONS.learn = TAB_NARRATIONS.aprender;
TAB_NARRATIONS.history = TAB_NARRATIONS.historico;
