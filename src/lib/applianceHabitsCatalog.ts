import { ApplianceInput, ApplianceKey } from "../types";

export type HabitDirection = "reduce" | "increase"; // se o hábito reduz ou intencionalmente aumenta/testa carga

export interface ApplianceHabitPreset {
  id: string;
  applianceKey: ApplianceKey;
  label: string;
  desc: string;
  physics: string;
  tip: string;
  direction?: HabitDirection; // default "reduce"
  /**
   * Modifica a cópia do aparelho simulado com base no estado 'on'
   * @param app Cópia mutável do aparelho em simulação
   * @param base Aparelho original da base de referência
   * @param on Se o hábito está ativado
   */
  apply: (app: ApplianceInput, base: ApplianceInput, on: boolean) => void;
}

export interface ApplianceHabitGroup {
  applianceKey: ApplianceKey;
  label: string;
  category: string;
  habits: ApplianceHabitPreset[];
}

/**
 * Catálogo Completo de Hábitos por Equipamento (Parte 1)
 * Todos os 36 equipamentos possuem de 2 a 6 hábitos técnicos, realistas e fundamentados na física de consumo.
 */
export const APPLIANCE_HABITS_CATALOG: Record<ApplianceKey, ApplianceHabitPreset[]> = {
  // 1. CHUVEIRO ELÉTRICO (5 hábitos)
  "chuveiro": [
    {
      id: "shower_summer",
      applianceKey: "chuveiro",
      label: "Mudar chave para posição Verão / Morno",
      desc: "Diminui a potência do chuveiro de ~5.500W para ~3.500W.",
      physics: "Na posição Verão, o chuveiro usa menos potência elétrica para aquecer a água, economizando cerca de 35% de energia em dias de clima ameno sem alterar o tempo de banho.",
      tip: "Em dias quentes ou de meia estação, a temperatura ambiente da água de entrada já é agradável.",
      apply: (app, base, on) => {
        if (app.showerDetails?.bathers) {
          app.showerDetails.bathers = app.showerDetails.bathers.map((b) => ({
            ...b,
            seasonSetting: on ? "verao" : b.seasonSetting,
          }));
        }
        if (app.showerDetails) {
          app.showerDetails.defaultSetting = on ? "verao" : (base.showerDetails?.defaultSetting || "inverno");
        } else {
          app.powerWatts = on
            ? Math.round((base.powerWatts || 5500) * 0.65)
            : base.powerWatts;
        }
      }
    },
    {
      id: "shower_soap",
      applianceKey: "chuveiro",
      label: "Fechar o registro ao se ensaboar e lavar cabelo",
      desc: "Interrompe o aquecedor elétrico durante a ensaboaçao.",
      physics: "Ao desligar o chuveiro durante a ensaboaçao, o aquecimento d'água cessa temporariamente, economizando cerca de 30% da energia daquele banho sem precisar de pressa.",
      tip: "Os chuveiros modernos suportam liga-desliga rápido sem danificar a resistência.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.70 * 100) / 100)
          : base.hoursPerDay;
        if (app.showerDetails?.bathers) {
          app.showerDetails.bathers = app.showerDetails.bathers.map((b) => ({
            ...b,
            minutesPerBath: on ? Math.max(1, Math.round(b.minutesPerBath * 0.70)) : b.minutesPerBath,
          }));
        }
      }
    },
    {
      id: "shower_restrictor",
      applianceKey: "chuveiro",
      label: "Instalar redutor de vazão no crivo da ducha",
      desc: "Limita o fluxo d'água mecânico, exigindo menor volume térmico por segundo.",
      physics: "Menor vazão de água permite que a água esquente com menor necessidade de abrir totalmente a chave, poupando energia elétrica e água ao mesmo tempo.",
      tip: "Discos redutores custam centavos e diminuem simultaneamente a conta de água e de luz.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 5500) * 0.80)
          : base.powerWatts;
      }
    },
    {
      id: "shower_clean_spread",
      applianceKey: "chuveiro",
      label: "Desobstruir e limpar furos do espalhador de água",
      desc: "Elimina acúmulo de calcário e minerais que reduzem a circulação da água.",
      physics: "Orifícios limpos geram jatos uniformes e facilitam a troca de calor da resistência para a água, evitando perda de eficiência e prolongando a vida útil do chuveiro.",
      tip: "Mergulhe o espalhador desmontado em vinagre morno por 20 minutos com uma escovinha macia.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 5500) * 0.95)
          : base.powerWatts;
      }
    },
    {
      id: "shower_longer_winter",
      applianceKey: "chuveiro",
      direction: "increase",
      label: "Simular banho mais longo no Inverno (+5 min em modo quente)",
      desc: "Simula o impacto de banhos demorados na potência máxima de inverno (inverno rigoroso).",
      physics: "No inverno, a combinação de chave no máximo com minutos extras de água ligada eleva fortemente o consumo elétrico mensal.",
      tip: "Útil para estimar quanto os meses frios pesam a mais no orçamento da casa.",
      apply: (app, base, on) => {
        if (on) {
          app.powerWatts = Math.round(Math.max(base.powerWatts || 5500, 6500) * 1.15);
          app.hoursPerDay = Math.round(base.hoursPerDay * 1.4 * 100) / 100;
          if (app.showerDetails?.bathers) {
            app.showerDetails.bathers = app.showerDetails.bathers.map((b) => ({
              ...b,
              seasonSetting: "inverno",
              minutesPerBath: Math.round(b.minutesPerBath + 5),
            }));
          }
        } else {
          app.powerWatts = base.powerWatts;
          app.hoursPerDay = base.hoursPerDay;
          if (app.showerDetails && base.showerDetails) {
            app.showerDetails = JSON.parse(JSON.stringify(base.showerDetails));
          }
        }
      }
    }
  ],

  // 2. AR-CONDICIONADO (6 hábitos)
  "ar-condicionado": [
    {
      id: "ac_temp_24",
      applianceKey: "ar-condicionado",
      label: "Ajustar termostato para 23°C ou 24°C",
      desc: "Reduz o esforço do ciclo de compressão em até 25% a 30%.",
      physics: "Cada 1°C a menos abaixo de 23°C força o compressor a operar cerca de 7% a 8% mais tempo em alta frequência para combater a taxa de troca de calor com o exterior. 24°C mantém conforto térmico ideal com consumo balanceado.",
      tip: "24°C é a temperatura recomendada pela Anvisa e pela ABNT para conforto humano saudável.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.35, Math.round((base.utilizationFactor || 0.65) * 0.70 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "ac_timer_night",
      applianceKey: "ar-condicionado",
      label: "Programar Timer noturno (-2 horas na madrugada)",
      desc: "Desliga automaticamente entre 4h e 6h quando o clima externo esfria.",
      physics: "Na madrugada a temperatura ambiente externa atinge o ponto mínimo do ciclo diário. As paredes e móveis mantêm inércia térmica suficiente para garantir sono confortável até o despertar.",
      tip: "Utilize a função Sleep / Good Sleep / Timer do controle remoto.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0, Math.round((base.hoursPerDay - 2) * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "ac_filter_clean",
      applianceKey: "ar-condicionado",
      label: "Limpeza mensal dos filtros de poeira da evaporadora",
      desc: "Evita perda de carga de ar e congelamento superficial da serpentina.",
      physics: "Filtros colmatados criam resistência pneumática ao ventilador tangencial e impedem a troca de calor, obrigando o compressor a trabalhar até 10% a 15% a mais para resfriar a mesma massa de ar.",
      tip: "Lave a malha plástica do filtro em água corrente morna uma vez ao mês.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.35, Math.round((base.utilizationFactor || 0.65) * 0.90 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "ac_insulation",
      applianceKey: "ar-condicionado",
      label: "Vedar frestas de portas e fechar cortinas contra o sol",
      desc: "Bloqueia a radiação infravermelha direta e a entrada de ar quente externo.",
      physics: "A radiação solar através de vidraças desprotegidas responde por até 40% da carga térmica sensível de um cômodo. Cortinas e vedação diminuem drasticamente os Watts térmicos a serem removidos.",
      tip: "Cortinas do tipo blackout ou persianas claras refletem a luz solar para fora.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.35, Math.round((base.utilizationFactor || 0.65) * 0.85 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "ac_fan_support",
      applianceKey: "ar-condicionado",
      label: "Usar ventilador em conjunto para circular o ar frio",
      desc: "Distribui o ar gelado acumulado no chão pelo cômodo todo de forma homogênea.",
      physics: "O ar frio é mais denso e tende a estratificar junto ao piso. O ventilador fraco faz convecção forçada, resfriando a pele pelo efeito wind-chill e permitindo subir o ar-condicionado em +2°C sem perder sensação de frescor.",
      tip: "Ligue o ventilador na velocidade mínima voltado para cima ou na oscilação ampla.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.35, Math.round((base.utilizationFactor || 0.65) * 0.80 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "ac_freeze_17",
      applianceKey: "ar-condicionado",
      direction: "increase",
      label: "Simular uso em 17°C com portas abertas",
      desc: "Simula o desperdício contínuo de termostato no mínimo forçando o compressor ao limite.",
      physics: "Em 17°C com frestas abertas o compressor nunca atinge o setpoint, operando em 100% de duty cycle contínuo com consumo elétrico de pico sem parar.",
      tip: "Ajuda a demonstrar o impacto do erro de ajuste de temperatura na fatura.",
      apply: (app, base, on) => {
        if (on) {
          app.utilizationFactor = Math.min(1.0, (base.utilizationFactor || 0.65) * 1.45);
          app.hoursPerDay = Math.round(base.hoursPerDay * 1.2 * 100) / 100;
        } else {
          app.utilizationFactor = base.utilizationFactor;
          app.hoursPerDay = base.hoursPerDay;
        }
      }
    }
  ],

  // 3. GELADEIRA / REFRIGERADOR (5 hábitos)
  "geladeira": [
    {
      id: "fridge_gasket",
      applianceKey: "geladeira",
      label: "Trocar ou higienizar borracha de vedação magnética",
      desc: "Impede a infiltração de ar quente e umidade pelas bordas da porta.",
      physics: "Se o ar frio denso vaza pela base, o ar quente e úmido entra pelo topo da porta. O termostato detecta aquecimento e aciona o compressor até 20% a mais do que o ciclo padrão.",
      tip: "Faça o teste da folha de papel: prenda uma folha na porta fechada. Se sair fácil ao puxar, a borracha precisa de troca.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.28, Math.round((base.utilizationFactor || 0.40) * 0.82 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "fridge_wall_clearance",
      applianceKey: "geladeira",
      label: "Afastar 15 cm da parede e limpar serpentina traseira",
      desc: "Melhora a convecção natural do condensador de calor.",
      physics: "Todo o calor retirado do interior dos alimentos precisa ser rejeitado para o ar ambiente pela grade condensadora. Se estiver abafada ou com poeira acumulada, a pressão interna do gás sobe, forçando o motor a gastar 10% a 15% mais eletricidade.",
      tip: "Nunca use a grade traseira da geladeira para secar tênis, panos ou roupas úmidas!",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 180) * 0.90)
          : base.powerWatts;
      }
    },
    {
      id: "fridge_no_hot_food",
      applianceKey: "geladeira",
      label: "Esperar panelas e pratos esfriarem antes de guardar",
      desc: "Evita sobrecarga térmica súbita e geração excessiva de vapor dentro do gabinete.",
      physics: "Vapor quente condensa e congela nas serpentinas do evaporador criando uma camada isolante de gelo, além de disparar o sensor de temperatura forçando o motor a girar por horas seguidas.",
      tip: "Deixe pratos e panelas atingirem temperatura ambiente antes de colocá-los na geladeira.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.28, Math.round((base.utilizationFactor || 0.40) * 0.93 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "fridge_thermostat_season",
      applianceKey: "geladeira",
      label: "Regular termostato para nível médio/mínimo no inverno",
      desc: "Ajusta o ponto de trabalho conforme a temperatura da cozinha.",
      physics: "No clima frio, a taxa de perda térmica do gabinete é muito menor. Manter o termostato no nível máximo de refrigeração congela alimentos e desperdiça cerca de 12% de energia.",
      tip: "Use potência máxima da geladeira somente em dias de muito calor ou em festas com abre-fecha frequente.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 180) * 0.88)
          : base.powerWatts;
      }
    },
    {
      id: "fridge_quick_door",
      applianceKey: "geladeira",
      label: "Evitar abrir a porta por tempo prolongado para pensar",
      desc: "Corta a troca de massa de ar frio por ar aquecido da cozinha.",
      physics: "Ao abrir a porta a 90 graus por 30 segundos, todo o ar refrigerado interior cai por gravidade e é substituído por ar a 26°C-30°C da cozinha, exigindo ciclo extra de 15 a 20 minutos de motor.",
      tip: "Organize prateleiras e potes identificados para pegar tudo o que precisa de uma só vez.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.28, Math.round((base.utilizationFactor || 0.40) * 0.92 * 100) / 100)
          : base.utilizationFactor;
      }
    }
  ],

  // 4. FREEZER (4 hábitos)
  "freezer": [
    {
      id: "freezer_defrost",
      applianceKey: "freezer",
      label: "Descongelar periodicamente quando o gelo passar de 0,5 cm",
      desc: "Remove a crosta de gelo que atua como isolante térmico nas paredes internas.",
      physics: "O gelo compactado possui condutividade térmica baixa em comparação ao metal das serpentinas, agindo como barreira isolante e fazendo o motor funcionar até 20% mais tempo para manter os -18°C.",
      tip: "Faça o degelo em dias de compra antes de reabastecer o freezer.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.30, Math.round((base.utilizationFactor || 0.45) * 0.85 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "freezer_gasket_check",
      applianceKey: "freezer",
      label: "Revisar vedação da tampa ou porta magnética",
      desc: "Garante vedação hermética contra o ar úmido exterior.",
      physics: "A diferença de temperatura de -18°C para +28°C cria gradiente de pressão. Qualquer folga na borracha gera entrada constante de calor latente de umidade.",
      tip: "Limpe o pó e aplique vaselina líquida ou talco na borracha para mantê-la maleável.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.30, Math.round((base.utilizationFactor || 0.45) * 0.88 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "freezer_organize_packs",
      applianceKey: "freezer",
      label: "Organizar e etiquetar pacotes para acesso veloz",
      desc: "Corta pela metade o tempo de tampa aberta procurando alimentos.",
      physics: "Em freezers horizontais a perda de ar frio é menor por convecção, mas freezers verticais perdem 100% da carga de ar a cada abertura longa.",
      tip: "Use cestos organizadores transparentes com carnes, legumes e polpas separados.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.30, Math.round((base.utilizationFactor || 0.45) * 0.92 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "freezer_wall_space",
      applianceKey: "freezer",
      label: "Manter ventilação livre ao redor do condensador",
      desc: "Evita acúmulo de ar quente ao redor das laterais e fundo do freezer.",
      physics: "Freezers modernos possuem condensadores embutidos nas paredes laterais externas. Se estiver colado em armários, o calor não dissipa.",
      tip: "Deixe ao menos 10 cm de espaço livre em cada lateral e atrás do freezer.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 160) * 0.92)
          : base.powerWatts;
      }
    }
  ],

  // 5. ILUMINAÇÃO GERAL (5 hábitos)
  "iluminacao": [
    {
      id: "light_100_led",
      applianceKey: "iluminacao",
      label: "Migrar 100% das lâmpadas para tecnologia LED (9W)",
      desc: "Substitui lâmpadas incandescentes (60W) e fluorescentes compactas (15W).",
      physics: "O diodo emissor de luz (LED) tem rendimento quântico luminoso muito superior: 9W de LED geram 810 lúmens com 85% menos consumo elétrico e aquecimento quase nulo comparado a 60W de filamento incandescente.",
      tip: "Lâmpadas LED duram de 15.000 a 25.000 horas e pagam seu custo em menos de 3 meses.",
      apply: (app, base, on) => {
        if (app.lightingRooms) {
          if (on) {
            app.lightingRooms.forEach((r) => {
              r.lamps.led += (r.lamps.incandescente || 0) + (r.lamps.fluorescente || 0);
              r.lamps.incandescente = 0;
              r.lamps.fluorescente = 0;
            });
          } else {
            const b = base.lightingRooms;
            if (b) app.lightingRooms = JSON.parse(JSON.stringify(b));
          }
        }
      }
    },
    {
      id: "light_turn_off_idle",
      applianceKey: "iluminacao",
      label: "Apagar luzes ao sair dos cômodos vazios (-1h diária)",
      desc: "Combate o hábito de deixar iluminação acesa em quartos e corredores vazios.",
      physics: "O consumo elétrico é diretamente proporcional à integral temporal do tempo de chave fechada. Eliminar 1 hora diária por lâmpada na casa gera economia cumulativa de dezenas de kWh por mês.",
      tip: "Crie a regra doméstica familiar: saiu do ambiente, dedinho no interruptor.",
      apply: (app, base, on) => {
        if (app.lightingRooms) {
          if (on) {
            app.lightingRooms.forEach((r) => {
              r.hoursPerDay = Math.max(0.5, Math.round((r.hoursPerDay - 1) * 10) / 10);
            });
          } else {
            const b = base.lightingRooms;
            if (b) app.lightingRooms = JSON.parse(JSON.stringify(b));
          }
        } else {
          app.hoursPerDay = on ? Math.max(1, app.hoursPerDay - 1.5) : base.hoursPerDay;
        }
      }
    },
    {
      id: "light_daylight",
      applianceKey: "iluminacao",
      label: "Aproveitar iluminação solar natural durante o dia",
      desc: "Abre persianas e janelas para iluminar salas de estudo e escritórios.",
      physics: "A luz natural do sol entrega de 10.000 a 50.000 lux sem custo elétrico, além de melhorar o ciclo circadiano e a concentração.",
      tip: "Posicione mesas de trabalho e escrivaninhas próximas a janelas bem iluminadas.",
      apply: (app, base, on) => {
        if (app.lightingRooms) {
          if (on) {
            app.lightingRooms.forEach((r) => {
              r.hoursPerDay = Math.max(0.5, Math.round((r.hoursPerDay - 1.5) * 10) / 10);
            });
          } else {
            const b = base.lightingRooms;
            if (b) app.lightingRooms = JSON.parse(JSON.stringify(b));
          }
        } else {
          app.hoursPerDay = on ? Math.max(1, app.hoursPerDay - 2) : base.hoursPerDay;
        }
      }
    },
    {
      id: "light_clean_luminaires",
      applianceKey: "iluminacao",
      label: "Limpar cúpulas, globos e plafons empoeirados",
      desc: "Remove poeira e fuligem que bloqueiam até 30% da luminosidade útil.",
      physics: "A transmitância de difusores acrílicos ou de vidro cai acentuadamente com depósitos de poeira. Luminárias limpas entregam mais lúmens por Watt sem precisar de lâmpadas extras.",
      tip: "Passe um pano de microfibra seco ou umedecido nos lustres a cada 3 meses.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 9) * 0.95)
          : base.powerWatts;
      }
    },
    {
      id: "light_decorative_excess",
      applianceKey: "iluminacao",
      direction: "increase",
      label: "Simular iluminação decorativa e externa acesa a noite toda",
      desc: "Simula o impacto de holofotes halógenos e spots de jardim esquecidos por 10h diárias.",
      physics: "Refletores e fitas decorativas de alta potência somam centenas de Watts rodando por 10 a 12 horas consecutivas toda madrugada.",
      tip: "Mostra como a iluminação externa mal dimensionada impacta a conta.",
      apply: (app, base, on) => {
        if (on) {
          app.hoursPerDay = Math.round(base.hoursPerDay * 1.5 * 10) / 10;
        } else {
          app.hoursPerDay = base.hoursPerDay;
        }
      }
    }
  ],

  // 6. TELEVISÃO (4 hábitos)
  "televisao": [
    {
      id: "tv_eco_mode",
      applianceKey: "televisao",
      label: "Ativar Modo ECO / Sensor de Luz Ambiente na TV",
      desc: "Reduz a potência do backlight LED em 20% a 25% sem perda de nitidez perceptível.",
      physics: "O painel de iluminação traseira (LED Backlight) consome até 80% da eletricidade de uma televisão. Ajustar o brilho para níveis condizentes com a sala corta consumo elétrico sem cansar a vista.",
      tip: "Evite perfis 'Vívido' ou 'Dinâmico' de vitrine de loja, que mantêm os LEDs no limite máximo.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 110) * 0.75)
          : base.powerWatts;
      }
    },
    {
      id: "tv_sleep_timer",
      applianceKey: "televisao",
      label: "Configurar Sleep Timer noturno na TV",
      desc: "Evita que o televisor passe a noite inteira ligado sozinho com todos dormindo.",
      physics: "Uma TV de 110W ligada por 6 horas na madrugada consome 0,66 kWh por noite, somando cerca de 20 kWh mensais de puro desperdício em áudio e imagem sem audiência.",
      tip: "Acione o timer de desligamento automático de 60 ou 90 minutos se você dorme assistindo TV.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round((base.hoursPerDay - 2) * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "tv_turn_off_background",
      applianceKey: "televisao",
      label: "Desligar a TV quando usada apenas como som de fundo",
      desc: "Substitui a tela ligada por caixa de som ou podcast de baixo consumo.",
      physics: "Uma Smart TV ligada consome de 90W a 150W para manter a tela gigante acesa. Uma caixa de som Bluetooth consome menos de 5W para a mesma finalidade de áudio.",
      tip: "Use um aplicativo de rádio/música no celular com caixa de som compacta.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.65 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "tv_unplug_vacation",
      applianceKey: "televisao",
      label: "Desligar na tomada ou filtro com chave ao viajar",
      desc: "Corta o standby contínuo de receptores infravermelhos e placas HDMI CEC.",
      physics: "Mesmo desligada no controle, a TV mantém módulos de escuta remota ativados consumindo de 0,5W a 2W 24 horas por dia.",
      tip: "Use uma régua de tomadas com interruptor para cortar de vez.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 110) * 0.95)
          : base.powerWatts;
      }
    }
  ],

  // 7. COMPUTADOR DESKTOP (4 hábitos)
  "computador": [
    {
      id: "pc_sleep_auto",
      applianceKey: "computador",
      label: "Configurar suspensão rápida do sistema (10 minutos)",
      desc: "Coloca CPU, placa de vídeo e monitores em baixo consumo quando inativos.",
      physics: "Um desktop com monitor em operação ociosa consome de 120W a 250W. No estado de suspensão S3/S0ix, o consumo cai para menos de 3W.",
      tip: "No Windows ou macOS, configure 'Desligar vídeo após 10 minutos' e 'Suspender após 15 minutos'.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.60 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pc_power_strip",
      applianceKey: "computador",
      label: "Desligar filtro de linha / régua geral ao encerrar o trabalho",
      desc: "Corta o consumo de periféricos, caixas de som e luzes RGB da estação de trabalho.",
      physics: "Monitores em standby, fontes ATX conectadas e caixas de som amplificadas somam de 10W a 25W de consumo vampiro 24h/dia se mantidos plugados.",
      tip: "Um único clique no interruptor da régua ao fim do dia elimina esse gasto fantasma.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.85 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pc_monitor_brightness",
      applianceKey: "computador",
      label: "Ajustar brilho dos monitores para 60% a 70%",
      desc: "Reduz o consumo da retroiluminação do painel sem comprometer a leitura.",
      physics: "O backlight do monitor consome linearmente com a taxa de brilho PWM. 100% de brilho num monitor gamer ou ultrawide pode consumir 45W, contra 22W em 60%.",
      tip: "Diminuir o brilho também reduz fadiga ocular e ressecamento dos olhos.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 250) * 0.85)
          : base.powerWatts;
      }
    },
    {
      id: "pc_clean_dust",
      applianceKey: "computador",
      label: "Limpar poeira dos coolers e saídas de ar do gabinete",
      desc: "Evita superaquecimento e redução de eficiência das ventoinhas.",
      physics: "Dissipadores entupidos elevam a temperatura de operação dos semicondutores, aumentando a resistência elétrica e fazendo fans rodarem a 100% de rotação.",
      tip: "Use uma lata de ar comprimido ou soprador a cada 6 meses com o PC desligado.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 250) * 0.93)
          : base.powerWatts;
      }
    }
  ],

  // 8. NOTEBOOK (3 hábitos)
  "notebook": [
    {
      id: "laptop_unplug_charged",
      applianceKey: "notebook",
      label: "Desconectar da tomada quando atingir 80% a 100% de carga",
      desc: "Evita manter o conversor AC/DC chaveado 24 horas desnecessariamente.",
      physics: "A fonte de alimentação converte 127V/220V com perdas térmicas contínuas por chaveamento de semicondutores mesmo quando a bateria já está plenamente abastecida.",
      tip: "Ative nos ajustes do fabricante o modo de preservação de saúde da bateria (limite de 80%).",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "laptop_energy_profile",
      applianceKey: "notebook",
      label: "Ativar perfil 'Economia de Energia' ou 'Balanceado'",
      desc: "Gerencia clock da CPU e diminui brilho de fundo quando em tarefas simples.",
      physics: "Processadores modernos operam com estados de energia dinâmicos (C-states e P-states). O perfil econômico reduz a tensão de núcleo (Vcore) e a frequência de clock em tarefas leves.",
      tip: "Para navegar e redigir textos, o modo econômico economiza até 35% de energia sem lentidão.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 50) * 0.75)
          : base.powerWatts;
      }
    },
    {
      id: "laptop_screen_timeout",
      applianceKey: "notebook",
      label: "Reduzir tempo de desligamento automático da tela para 5 min",
      desc: "Apaga a tela integrada rapidamente ao se afastar do aparelho.",
      physics: "A tela é o componente de maior consumo em um notebook em tarefas de escritório. Apagá-la com 5 minutos poupa bateria e ciclos de recarga da rede elétrica.",
      tip: "Basta pressionar qualquer tecla para acordar instantaneamente.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.85 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 9. VIDEOGAME / CONSOLE (3 hábitos)
  "videogame": [
    {
      id: "console_full_shutdown",
      applianceKey: "videogame",
      label: "Desligar console completamente (Modo Desligado em vez de Repouso)",
      desc: "Evita o consumo contínuo de 10W a 15W no modo de repouso dos consoles modernos.",
      physics: "Consoles de última geração mantêm processadores auxiliares, placa de rede e portas USB energizadas no modo repouso, gastando de 8 a 15 kWh por mês mesmo sem jogar.",
      tip: "Deixe em modo repouso apenas quando estiver baixando atualizações pesadas de jogos.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "console_auto_off",
      applianceKey: "videogame",
      label: "Ativar desligamento automático por inatividade (20 minutos)",
      desc: "Desliga o console caso seja deixado pausado no menu de um jogo.",
      physics: "Com o jogo pausado, a GPU continua renderizando em 3D e puxando até 150W a 200W da tomada sem ninguém na frente da televisão.",
      tip: "Ative nas configurações do console: 'Economia de energia > Desligar após 20 min sem uso'.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.75 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "console_media_alternative",
      applianceKey: "videogame",
      label: "Usar o aplicativo da Smart TV para filmes em vez do console",
      desc: "Assiste a Netflix, YouTube e streamings diretamente no aplicativo nativo da TV.",
      physics: "Um console de videogame consome de 70W a 90W apenas para decodificar um vídeo de streaming. O chip integrado da Smart TV faz a mesma função consumindo menos de 5W adicionais.",
      tip: "Abra os aplicativos de filmes e séries direto pelo controle remoto da televisão.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 10. RECEPTOR DE TV / TV BOX (3 hábitos)
  "receptor-tv": [
    {
      id: "box_switch_off",
      applianceKey: "receptor-tv",
      label: "Desligar na chave geral quando a TV for desligada",
      desc: "Corta a alimentação de aparelhos que continuam consumindo 15W direto no standby.",
      physics: "Receptores de TV a cabo e TV boxes decodificam sinais mesmo em standby, dissipando praticamente a mesma potência térmica ligados ou desligados no controle.",
      tip: "Ligue a TV Box no mesmo filtro de linha com chave da televisão.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.50 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "box_sleep_timer",
      applianceKey: "receptor-tv",
      label: "Ativar modo de suspensão profunda (Deep Sleep)",
      desc: "Configura o sistema operacional do aparelho para cortar circuitos internos ociosos.",
      physics: "Em deep sleep o consumo cai de 15W para menos de 1W desativando circuitos de sintonização e decodificação de imagem.",
      tip: "Consulte o menu de energia do aparelho sob 'Configurações de Energia'.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 15) * 0.60)
          : base.powerWatts;
      }
    },
    {
      id: "box_unplug_unused",
      applianceKey: "receptor-tv",
      label: "Desconectar receptor em quartos de hóspedes ou TVs secundárias",
      desc: "Elimina consumo de aparelhos em televisões raramente utilizadas.",
      physics: "Um aparelho de 15W plugado 24 horas por 30 dias consome quase 11 kWh/mês mesmo que a televisão nunca seja ligada.",
      tip: "Mantenha fora da tomada nos cômodos sem uso frequente.",
      apply: (app, base, on) => {
        app.hoursPerDay = on ? 0.5 : base.hoursPerDay;
      }
    }
  ],

  // 11. ROTEADOR WI-FI / MODEM (2 hábitos)
  "roteador": [
    {
      id: "router_night_wifi",
      applianceKey: "roteador",
      label: "Programar desligamento programado do Wi-Fi na madrugada (Wi-Fi Schedule)",
      desc: "Desliga a transmissão de rádio de 2.4GHz e 5GHz durante a madrugada (ex: 1h às 6h).",
      physics: "Os amplificadores de potência de radiofrequência (PA/RF) respondem por boa parte da energia do roteador. Desativá-los na madrugada reduz o consumo elétrico e a emissão eletromagnética ociosa.",
      tip: "Acesse o painel do roteador pelo navegador e configure o recurso 'Agendador de Wi-Fi'.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 12) * 0.80)
          : base.powerWatts;
      }
    },
    {
      id: "router_ventilation",
      applianceKey: "roteador",
      label: "Posicionar roteador em local ventilado sem cobrir de enfeites",
      desc: "Evita o aquecimento excessivo dos processadores de rede do modem.",
      physics: "Modems fechados em nichos sem circulação sofrem estresse térmico, o que aumenta as perdas por aquecimento e degrada a eficiência de conversão da fonte.",
      tip: "Mantenha o aparelho em local aberto, arejado e elevado.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 12) * 0.90)
          : base.powerWatts;
      }
    }
  ],

  // 12. MÁQUINA DE LAVAR ROUPAS (4 hábitos)
  "lavadora": [
    {
      id: "laundry_full_load",
      applianceKey: "lavadora",
      label: "Lavar roupas sempre na capacidade nominal máxima do tambor",
      desc: "Acumula roupas da semana para reduzir o número de ciclos pela metade.",
      physics: "O motor de indução consome praticamente a mesma quantidade de energia elétrica seja lavando meia carga ou a capacidade máxima do cesto, além de gastar a mesma água.",
      tip: "Lavar duas meias cargas gasta o dobro de eletricidade e o dobro de água.",
      apply: (app, base, on) => {
        app.frequency = on
          ? Math.max(1, Math.round(base.frequency / 2))
          : base.frequency;
      }
    },
    {
      id: "laundry_cold_water",
      applianceKey: "lavadora",
      label: "Lavar exclusivamente com água fria",
      desc: "Desativa o aquecedor interno elétrico em máquinas lava-e-seca.",
      physics: "A resistência de aquecimento consome de 1.200W a 2.000W; lavar em água fria consome apenas os 300W a 500W do motor de rotação.",
      tip: "Os sabões líquidos modernos contêm enzimas formuladas para limpeza pesada em água fria.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 600) * 0.40)
          : base.powerWatts;
      }
    },
    {
      id: "laundry_quick_cycle",
      applianceKey: "lavadora",
      label: "Utilizar ciclo rápido para roupas pouco sujas do dia a dia",
      desc: "Reduz o tempo de motor ligado de 1h20 para 30 a 40 minutos.",
      physics: "Ciclos curtos reduzem linearmente as horas de rotação do motor elétrico sem comprometer a higienização de roupas sem manchas.",
      tip: "Selecione o programa 'Rápido 30 min' para roupas de academia ou suor leve.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.3, Math.round(base.hoursPerDay * 0.55 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "laundry_clean_filter",
      applianceKey: "lavadora",
      label: "Limpeza periódica do filtro de fiapos e bomba de drenagem",
      desc: "Evita sobrecarga e esforço mecânico na bomba de esgotamento de água.",
      physics: "Fiapos acumulados aumentam a resistência hidrodinâmica na bomba de drenagem, forçando o motor elétrico e prolongando o ciclo.",
      tip: "Retire o filtro interno e passe em água corrente a cada 3 lavagens.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 600) * 0.95)
          : base.powerWatts;
      }
    }
  ],

  // 13. SECADORA DE ROUPAS ELÉTRICA (4 hábitos)
  "secadora-roupas": [
    {
      id: "dryer_varal_sun",
      applianceKey: "secadora-roupas",
      label: "Secar roupas no varal ao sol em dias abertos",
      desc: "Usa a radiação solar e o vento natural gratuitos para evaporar a água das roupas.",
      physics: "A secadora elétrica utiliza resistências de 2.200W a 3.000W para gerar calor e evaporar a água. O calor solar e a convecção do vento fazem o mesmo com zero custo elétrico.",
      tip: "Utilize a secadora apenas em dias chuvosos contínuos ou emergências de uniforme.",
      apply: (app, base, on) => {
        app.frequency = on
          ? Math.max(1, Math.round(base.frequency * 0.35))
          : base.frequency;
      }
    },
    {
      id: "dryer_clean_lint",
      applianceKey: "secadora-roupas",
      label: "Limpar filtro de fiapos antes de toda secagem",
      desc: "Permite fluxo de ar quente desimpedido pelo tambor.",
      physics: "Um filtro de ar saturado de fiapos bloqueia a circulação de ar aquecido, dobrando o tempo de ciclo necessário para secar a mesma carga de roupas.",
      tip: "Passe o dedo ou escovinha no filtro antes de apertar o botão de início.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.4, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "dryer_max_spin_first",
      applianceKey: "secadora-roupas",
      label: "Centrifugar as roupas na velocidade máxima da lavadora antes de secar",
      desc: "Extrai a maior quantidade de água mecânica antes do processo térmico.",
      physics: "A remoção de água por força centrífuga consome centenas de vezes menos energia do que a evaporação térmica por calor latente (540 cal/g).",
      tip: "Selecione centrifugação de 1.200 ou 1.400 RPM na lavadora para reduzir em até 30 minutos a secadora.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.4, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "dryer_sensor_iron_dry",
      applianceKey: "secadora-roupas",
      label: "Selecionar ponto 'Seco para Passar' em vez de secagem extrema",
      desc: "Interrompe o aquecimento antes que os tecidos fiquem esturricados.",
      physics: "Evapora a água excedente deixando umidade residual de 3% a 5%, facilitando o engomar das roupas e poupando os 20 minutos finais mais custosos da resistência.",
      tip: "Roupas saem mais macias e com menos vincos difíceis de desamassar.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.4, Math.round(base.hoursPerDay * 0.82 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 14. FERRO DE PASSAR ROUPA (3 hábitos)
  "ferro": [
    {
      id: "iron_batch_pass",
      applianceKey: "ferro",
      label: "Passar roupas em lote semanal acumulado",
      desc: "Evita ligar o ferro para desamassar 1 ou 2 peças avulsas todos os dias.",
      physics: "O ferro de 1.200W a 1.500W gasta um pico de alta energia para aquecer a base metálica. Passar peças avulsas repete esse ciclo de pré-aquecimento inútil várias vezes.",
      tip: "Reserve um dia da semana para passar todas as roupas de uma só vez.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "iron_residual_heat",
      applianceKey: "ferro",
      label: "Desligar o ferro da tomada antes do fim e usar o calor residual",
      desc: "Aproveita a inércia térmica da base metálica para passar tecidos leves.",
      physics: "A base de alumínio/cerâmica acumula calor sensível substancial. Desligar nos últimos 10 a 15 minutos é suficiente para desamassar sedas, camisas de poliéster e sintéticos com zero gasto elétrico.",
      tip: "Comece pelas roupas pesadas (jeans/linho) e termine nas leves com o ferro desligado.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "iron_hanger_dry",
      applianceKey: "ferro",
      label: "Secar camisas e camisetas direto no cabide",
      desc: "Elimina a necessidade de passar boa parte das roupas casuais.",
      physics: "A gravidade alinha as fibras úmidas enquanto secam penduradas no cabide, reduzindo ou dispensando o uso do ferro em até 50% das peças da família.",
      tip: "Ao tirar da máquina, dê uma leve sacudida na peça e pendure imediatamente no cabide.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.55 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 15. LAVA-LOUÇAS (4 hábitos)
  "lava-loucas": [
    {
      id: "dish_full_load",
      applianceKey: "lava-loucas",
      label: "Ligar apenas com carga completa de louças",
      desc: "Acumula pratos e talheres até preencher todos os cestos antes de iniciar o ciclo.",
      physics: "A lava-louças gasta praticamente a mesma água e energia elétrica (cerca de 1,2 kWh por ciclo) independentemente de estar cheia ou pela metade.",
      tip: "Deixe pratos pré-raspados descansando na máquina fechada até encher.",
      apply: (app, base, on) => {
        app.frequency = on
          ? Math.max(1, Math.round(base.frequency * 0.60))
          : base.frequency;
      }
    },
    {
      id: "dish_eco_cycle",
      applianceKey: "lava-loucas",
      label: "Utilizar ciclo ECO / 50°C",
      desc: "Aquece a água a 50°C em vez de 65°C/70°C compensando com tempo de ação química dos detergentes.",
      physics: "A maior parte da energia da lava-louças (~85%) vai para a resistência de aquecimento da água. Baixar a temperatura de lavagem poupa de 25% a 30% da eletricidade do ciclo.",
      tip: "Excelente para pratos normais e copos do dia a dia.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 1500) * 0.75)
          : base.powerWatts;
      }
    },
    {
      id: "dish_air_dry",
      applianceKey: "lava-loucas",
      label: "Desativar secagem com ar quente e abrir a porta ao término",
      desc: "Aproveita o calor residual das louças para secagem por convecção natural.",
      physics: "A fase de secagem forçada com resistência consome calor elevado. Ao abrir a porta no fim do enxágue quente, a água evapora rapidamente sem gasto elétrico adicional.",
      tip: "Muitas máquinas modernas possuem abertura automática da porta no fim do ciclo.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.3, Math.round(base.hoursPerDay * 0.75 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "dish_scrape_no_rinse",
      applianceKey: "lava-loucas",
      label: "Raspar restos de comida com espátula sem enxaguar na pia antes",
      desc: "Evita desperdício de água e eletricidade de torneiras elétricas da pia.",
      physics: "Os detergentes enzimáticos precisam de resíduos de gordura para agir quimicamente com eficiência de desengorduramento.",
      tip: "Use uma espátula de silicone para jogar os restos sólidos direto na lixeira orgânica.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.5, Math.round((base.utilizationFactor || 0.75) * 0.90 * 100) / 100)
          : base.utilizationFactor;
      }
    }
  ],

  // 16. AIR FRYER / FRITADEIRA SEM ÓLEO (3 hábitos)
  "air-fryer": [
    {
      id: "airfryer_no_preheat",
      applianceKey: "air-fryer",
      label: "Dispensar pré-aquecimento longo para a maioria das receitas",
      desc: "Coloca os alimentos direto no cesto antes de ligar a resistência de 1.400W.",
      physics: "Devido à câmara compacta com alta velocidade de convecção de ar, a temperatura alvo é atingida em menos de 60 segundos, tornando pré-aquecimentos de 5 a 10 minutos puro desperdício térmico.",
      tip: "Adicione apenas 1 a 2 minutos ao tempo de preparo total do alimento.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.75 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "airfryer_batch_cooking",
      applianceKey: "air-fryer",
      label: "Aproveitar cesto aquecido para preparar porções seguidas",
      desc: "Cozinha a segunda porção imediatamente após a primeira sem perda de calor.",
      physics: "O metal do cesto e a câmara isolada retêm calor a mais de 180°C. Preparar a segunda fornada sem esfriar corta cerca de 30% do tempo de resistência ligada.",
      tip: "Deixe os ingredientes da segunda remessa já cortados e temperados à mão.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.85 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "airfryer_clean_basket",
      applianceKey: "air-fryer",
      label: "Manter a grade do cesto e resistência superior limpas",
      desc: "Permite radiação infravermelha direta e circulação desobstruída do ar quente.",
      physics: "Gordura carbonizada na resistência superior forma uma camada isolante de fuligem, reduzindo a emissão de radiação térmica em direção aos alimentos.",
      tip: "Passe uma esponja macia com desengordurante sob a resistência (com o aparelho desplugado e frio).",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 1400) * 0.95)
          : base.powerWatts;
      }
    }
  ],

  // 17. FORNO ELÉTRICO (3 hábitos)
  "forno-eletrico": [
    {
      id: "oven_preheat_disciplined",
      applianceKey: "forno-eletrico",
      label: "Limitar pré-aquecimento a no máximo 10 minutos",
      desc: "Evita deixar o forno de 1.800W ligado vazio antes de assar.",
      physics: "Forros elétricos residenciais atingem 180°C em 8 a 10 minutos. Deixar 25 ou 30 minutos pré-aquecendo dissipa calor pelas paredes sem produzir alimento.",
      tip: "Ligue o forno somente quando a forma ou refratário já estiver quase pronta para entrar.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "oven_residual_heat",
      applianceKey: "forno-eletrico",
      label: "Desligar 10 minutos antes e finalizar com o calor retido",
      desc: "Aproveita a inércia térmica refratária do forno para completar o cozimento.",
      physics: "Um forno bem vedado mantém temperatura acima de 150°C por mais de 15 minutos após desligado, completando gratinados e assados com zero consumo elétrico no trecho final.",
      tip: "Mantenha a porta estritamente fechada após desligar a chave.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.85 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "oven_no_peek",
      applianceKey: "forno-eletrico",
      label: "Não abrir a porta do forno repetidamente durante o assado",
      desc: "Usa a luz interna e o vidro transparente para conferir o ponto.",
      physics: "Cada abertura de porta faz escapar de 20% a 30% do calor interno por convecção livre, forçando a resistência a operar no máximo para reaquecer o compartimento.",
      tip: "Mantenha o vidro interno limpo para enxergar sem abrir.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.5, Math.round((base.utilizationFactor || 0.75) * 0.88 * 100) / 100)
          : base.utilizationFactor;
      }
    }
  ],

  // 18. FORNO MICRO-ONDAS (3 hábitos)
  "microondas": [
    {
      id: "mw_thaw_natural",
      applianceKey: "microondas",
      label: "Descongelar alimentos na geladeira na véspera",
      desc: "Dispensa ciclos longos de descongelamento de 15 a 20 minutos de micro-ondas.",
      physics: "O degelo natural na geladeira ainda transfere 'frio' para o refrigerador, aliviando o motor da geladeira e eliminando centenas de Watts de magnetron.",
      tip: "Passe carnes do freezer para a prateleira de baixo da geladeira na noite anterior.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.60 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "mw_lid_cover",
      applianceKey: "microondas",
      label: "Usar tampa plástica com respiro durante aquecimento",
      desc: "Retém o vapor aquecido ao redor da comida, acelerando o tempo de cozimento.",
      physics: "O vapor d'água sob a tampa cria uma câmara de calor úmido de convecção, reduzindo o tempo de acionamento do magnetron em cerca de 25%.",
      tip: "Evita também respingos nas paredes internas do aparelho.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.75 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "mw_power_match",
      applianceKey: "microondas",
      label: "Ajustar potência conforme o tipo de alimento (evitar sempre 100%)",
      desc: "Evita fervura excessiva e perda de água em líquidos e ensopados.",
      physics: "Ajustar potências intermediárias faz chaveamento temporal ideal, aquecendo de dentro para fora sem queimar as bordas.",
      tip: "Para reaquecer arroz e ensopados, potência 70 ou 80 é mais uniforme.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 1200) * 0.85)
          : base.powerWatts;
      }
    }
  ],

  // 19. BEBEDOURO / PURIFICADOR DE ÁGUA REFRIGERADO (3 hábitos)
  "gela-agua": [
    {
      id: "gela_winter_eco",
      applianceKey: "gela-agua",
      label: "Desligar refrigeração ou regular no mínimo no inverno",
      desc: "Em períodos frios, a água natural da tubulação já está em temperatura fresca.",
      physics: "O compressor ou placa Peltier tenta continuamente manter a cuba a 5°C-8°C contra temperatura ambiente já amena, gerando consumo cíclico desnecessário.",
      tip: "Basta desligar a chave traseira de refrigeração e usar a água na temperatura natural.",
      apply: (app, base, on) => {
        app.utilizationFactor = on
          ? Math.max(0.10, Math.round((base.utilizationFactor || 0.30) * 0.50 * 100) / 100)
          : base.utilizationFactor;
      }
    },
    {
      id: "gela_night_timer",
      applianceKey: "gela-agua",
      label: "Desligar da tomada durante a noite ou usar tomada com timer",
      desc: "Corta os ciclos do motor entre meia-noite e 6h quando ninguém bebe água.",
      physics: "O reservatório perde temperatura por condução térmica ao longo da madrugada e liga o compressor repetidas vezes sem consumo de água.",
      tip: "Um timer de tomada mecânico ou digital de R$ 25 automatiza esse corte noturno.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(8, Math.round(base.hoursPerDay * 0.70))
          : base.hoursPerDay;
      }
    },
    {
      id: "gela_wall_space",
      applianceKey: "gela-agua",
      label: "Manter grelha de ventilação desobstruída e livre de poeira",
      desc: "Permite troca de calor facilitada da unidade condensadora.",
      physics: "Aparelhos com placa Peltier ou microcompressor travam a troca térmica quando empurrados contra a parede, dobrando o tempo de funcionamento elétrico.",
      tip: "Mantenha ao menos 8 cm de vão livre na traseira do bebedouro.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 100) * 0.88)
          : base.powerWatts;
      }
    }
  ],

  // 20. PANELA ELÉTRICA (ARROZ / PRESSÃO) (2 hábitos)
  "panela-eletrica": [
    {
      id: "pot_unplug_warm",
      applianceKey: "panela-eletrica",
      label: "Desligar da tomada após o cozimento (não deixar no modo 'Aquecer' por horas)",
      desc: "Evita que a resistência de manutenção fique ligada por horas mantendo o arroz quente.",
      physics: "O modo 'Aquecer' mantém de 40W a 60W pulsando na resistência. Deixar a panela conectada a tarde inteira consome mais do que o próprio cozimento do arroz.",
      tip: "Tire o plugue da tomada assim que terminar de cozinhar; a tampa veda o calor por muito tempo.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.3, Math.round(base.hoursPerDay * 0.60 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pot_clean_base",
      applianceKey: "panela-eletrica",
      label: "Limpar o fundo da cuba metálica e a placa aquecedora",
      desc: "Garante contato térmico direto e perfeito entre a placa e o recipiente.",
      physics: "Grãos de arroz secos ou sujeira entre a placa e a cuba funcionam como isolante, retardando a condução de calor e estendendo o tempo de cozimento.",
      tip: "Passe um pano úmido na chapa de aquecimento fria antes de encaixar a cuba.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 800) * 0.93)
          : base.powerWatts;
      }
    }
  ],

  // 21. SANDUICHEIRA / GRILL (2 hábitos)
  "sanduicheira": [
    {
      id: "grill_unplug_prompt",
      applianceKey: "sanduicheira",
      label: "Desligar da tomada imediatamente ao retirar o lanche",
      desc: "Evita que o aparelho fique energizado quente sobre a bancada sem uso.",
      physics: "Sanduicheiras e grills não possuem botão liga-desliga em sua maioria; continuam consumindo 750W em ciclos contínuos de termostato até serem desplugadas da parede.",
      tip: "Crie o hábito de puxar o plugue no momento em que colocar o lanche no prato.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "grill_residual_cheese",
      applianceKey: "sanduicheira",
      label: "Aproveitar as placas quentes para derreter o recheio",
      desc: "Desliga a sanduicheira no meio do processo e fecha a tampa.",
      physics: "A massa metálica com revestimento antiaderente guarda calor suficiente para derreter queijos sem precisar de energia ativa durante os minutos finais.",
      tip: "Desconecte e aguarde 1 minuto: o pão continuará crocante e o recheio derretido.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 22. CAFETEIRA ELÉTRICA (2 hábitos)
  "cafeteira": [
    {
      id: "coffee_thermos_pour",
      applianceKey: "cafeteira",
      label: "Passar o café para garrafa térmica e desligar a cafeteira",
      desc: "Desliga a placa aquecedora que mantém a jarra de vidro sobre a resistência.",
      physics: "A placa aquecedora consome de 60W a 100W contínuos para compensar a perda térmica do vidro. A garrafa térmica isola por vácuo com zero consumo de eletricidade.",
      tip: "O café mantido na placa aquecedora também queima e fica amargo; na garrafa térmica ele preserva o sabor original.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.50 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "coffee_descaling",
      applianceKey: "cafeteira",
      label: "Descalcificar o duto de aquecimento a cada 3 meses",
      desc: "Remove crostas minerais que atrasam a passagem da água quente.",
      physics: "Incrustações de carbonato de cálcio no tubete de alumínio diminuem o fluxo de água e exigem mais tempo de resistência elétrica acionada.",
      tip: "Passe um ciclo de água morna com vinagre branco ou ácido cítrico alimentício.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 800) * 0.92)
          : base.powerWatts;
      }
    }
  ],

  // 23. LIQUIDIFICADOR (2 hábitos)
  "liquidificador": [
    {
      id: "blender_order_liquids",
      applianceKey: "liquidificador",
      label: "Colocar líquidos antes dos sólidos para bater mais rápido",
      desc: "Facilita a formação do vórtice hidrodinâmico e alivia o motor elétrico.",
      physics: "Líquidos na base criam sustentação fluida que puxa os sólidos para a lâmina instantaneamente, reduzindo o tempo de atrito do motor em até 40%.",
      tip: "Primeiro água/leite, depois frutas picadas e por último gelo.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.02, Math.round(base.hoursPerDay * 0.65 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "blender_sharp_blade",
      applianceKey: "liquidificador",
      label: "Manter o conjunto de lâminas limpo e afiado",
      desc: "Corta os alimentos por cisalhamento mecânico eficiente em vez de esmagamento.",
      physics: "Lâminas cegas exigem rotação em velocidade máxima por muito mais tempo, gerando calor no rotor do motor em vez de trabalho útil.",
      tip: "Evite bater ossos ou alimentos excessivamente congelados em blocos gigantes.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 500) * 0.90)
          : base.powerWatts;
      }
    }
  ],

  // 24. BATEDEIRA (2 hábitos)
  "batedeira": [
    {
      id: "mixer_room_temp",
      applianceKey: "batedeira",
      label: "Usar manteiga e ovos em temperatura ambiente ao bater massas",
      desc: "Diminui a viscosidade e resistência mecânica oferecida aos batedores.",
      physics: "Gorduras geladas aumentam o torque requerido pelo motor elétrico, forçando-o a trabalhar sob maior amperagem e aquecimento.",
      tip: "Tire ingredientes da geladeira 20 minutos antes de iniciar receitas de bolos.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.75 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "mixer_speed_progressive",
      applianceKey: "batedeira",
      label: "Iniciar em velocidade baixa e aumentar gradualmente",
      desc: "Evita picos de corrente no acionamento inicial dos enrolamentos do motor.",
      physics: "A corrente de partida com massa pesada atinge picos de partida (inrush). O início gradual poupa as bobinas e estabiliza a mistura.",
      tip: "Use a velocidade 1 por 30 segundos antes de subir para velocidades maiores.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 300) * 0.92)
          : base.powerWatts;
      }
    }
  ],

  // 25. COIFA / EXAUSTOR (2 hábitos)
  "exaustor": [
    {
      id: "hood_clean_metal_filter",
      applianceKey: "exaustor",
      label: "Lavar filtros metálicos antigordura quinzenalmente",
      desc: "Remove o filme viscoso de óleo que bloqueia as aletas da hélice centrífuga.",
      physics: "Telas engorduradas aumentam a perda de carga estática do duto, obrigando o exaustor a rodar na velocidade máxima para mover a mesma vazão de ar (m³/h).",
      tip: "Deixe as grelhas de molho em água quente com detergente desengordurante ou lave na lava-louças.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 180) * 0.85)
          : base.powerWatts;
      }
    },
    {
      id: "hood_match_pan_cooking",
      applianceKey: "exaustor",
      label: "Desligar 3 minutos após o término do cozimento",
      desc: "Evita esquecer o motor ligado na cozinha após servir a mesa.",
      physics: "Com os fogões apagados, a geração de vapores cessa rapidamente. Deixar rodando sem fumaça apenas desperdiça energia elétrica.",
      tip: "Programe o timer da coifa se o seu modelo possuir a função.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 26. TORNEIRA ELÉTRICA DA PIA (4 hábitos)
  "torneira": [
    {
      id: "tap_cold_rinse",
      applianceKey: "torneira",
      label: "Usar água fria para enxaguar e água morna apenas para desengordurar",
      desc: "Corta pela metade o tempo de resistência elétrica acionada na pia.",
      physics: "A torneira elétrica dissipa de 3.500W a 5.500W de potência. Usá-la para enxágues simples que não demandam água quente drena kWh rapidamente.",
      tip: "Passe o sabão em tudo com a torneira fechada e abra no morno só na louça engordurada.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.50 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "tap_aerator_clean",
      applianceKey: "torneira",
      label: "Instalar ou desobstruir arejador no bico da torneira",
      desc: "Mistura bolhas de ar à água aumentando a sensação de volume com menor vazão.",
      physics: "O arejador reduz a vazão em até 50% sem perder poder de lavagem, reduzindo o calor total necessário para aquecer a coluna d'água.",
      tip: "Custa poucos reais e desrosqueia facilmente com a mão para limpeza periódica.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 4500) * 0.80)
          : base.powerWatts;
      }
    },
    {
      id: "tap_summer_mode",
      applianceKey: "torneira",
      label: "Mudar chave de temperatura para posição 'Morno' ou 'Econômica'",
      desc: "Reduz a potência elétrica da espiral de aquecimento nos meses quentes.",
      physics: "A posição econômica utiliza menor segmento ôhmico da resistência, reduzindo a potência em ~30% a 40%.",
      tip: "Para tirar gordura de pratos, 35°C já é mais que suficiente; não precisa de água fervente.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 4500) * 0.68)
          : base.powerWatts;
      }
    },
    {
      id: "tap_close_soaping",
      applianceKey: "torneira",
      label: "Fechar a torneira enquanto esfrega panelas e pratos com esponja",
      desc: "Interrompe o fluxo de 4.500W nos minutos em que a esponja está em ação.",
      physics: "Deixar a torneira correndo enquanto ensaboa pratos dissipa energia pura pelo ralo sem contato com a louça.",
      tip: "Abra a torneira apenas na hora de enxaguar a louça já ensaboada.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.60 * 100) / 100)
          : base.hoursPerDay;
      }
    }
  ],

  // 27. SECADOR DE CABELO (3 hábitos)
  "secador": [
    {
      id: "hair_towel_turban",
      applianceKey: "secador",
      label: "Pré-secar com toalha de microfibra por 10 minutos antes do secador",
      desc: "Absorve a maior parte da água por capilaridade mecânica antes do calor.",
      physics: "Secadores de 1.800W a 2.200W consomem energia altíssima para evaporar água por calor latente. Toalhas de microfibra retiram até 60% da água com zero consumo elétrico.",
      tip: "Faça um turbante com a toalha enquanto se veste para acelerar a secagem.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.55 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "hair_medium_temp",
      applianceKey: "secador",
      label: "Usar temperatura morna/média com velocidade máxima de ar",
      desc: "Privilegia o fluxo de ar em vez da temperatura extrema da resistência.",
      physics: "A velocidade do ar (convecção forçada) acelera a evaporação com metade do consumo térmico da resistência e agride menos as cutículas do cabelo.",
      tip: "Seu cabelo fica mais brilhante e o secador gasta cerca de 30% menos energia.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 1800) * 0.70)
          : base.powerWatts;
      }
    },
    {
      id: "hair_clean_air_intake",
      applianceKey: "secador",
      label: "Limpar fios de cabelo e poeira da grade traseira de ar",
      desc: "Evita superaquecimento do motor e diminuição do fluxo de vento.",
      physics: "A grade traseira com fiapos bloqueia a passagem do ar, fazendo o secador esquentar além do necessário, perder força de vento e forçar o motor elétrico.",
      tip: "Desenrosque a tampa traseira para remover os fiapos de cabelo mensalmente.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 1800) * 0.94)
          : base.powerWatts;
      }
    }
  ],

  // 28. PRANCHA / CHAPINHA DE CABELO (2 hábitos)
  "chapinha": [
    {
      id: "straightener_dry_hair_only",
      applianceKey: "chapinha",
      label: "Usar chapinha apenas no cabelo 100% seco",
      desc: "Evita que a prancha gaste calor fervendo a umidade residual dos fios.",
      physics: "Aplicar placas a 200°C em fios úmidos provoca choque térmico, vapor superaquecido (que queima os fios) e exige passadas repetidas.",
      tip: "Certifique-se de que o cabelo está totalmente seco antes de pranchar.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.70 * 100) / 100)
          : base.hoursPerDay;
      }
    },
    {
      id: "straightener_unplug_prompt",
      applianceKey: "chapinha",
      label: "Desligar da tomada imediatamente após a última mecha",
      desc: "Evita deixar a prancha aquecida sobre a bancada enquanto finaliza a produção.",
      physics: "A chapinha atinge temperatura máxima em segundos; deixá-la ligada à toa gera consumo desnecessário e risco de queimaduras em móveis.",
      tip: "Puxe o plugue da tomada assim que terminar a última mecha.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.05, Math.round(base.hoursPerDay * 0.80 * 100) / 100)
          : base.hoursPerDay;
      }
    }
  ],

  // 29. VENTILADOR DE MESA OU COLUNA (3 hábitos)
  "ventilador": [
    {
      id: "fan_speed_medium",
      applianceKey: "ventilador",
      label: "Usar velocidade média ou baixa em vez da máxima",
      desc: "Reduz a potência consumida pelo motor de indução em até 35%.",
      physics: "A potência elétrica exigida pela hélice cresce proporcionalmente ao cubo da velocidade angular (P ∝ ω³). Na velocidade média a brisa é suave com consumo bem menor.",
      tip: "A velocidade máxima é necessária apenas nos minutos iniciais mais quentes.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 80) * 0.70)
          : base.powerWatts;
      }
    },
    {
      id: "fan_turn_off_empty_room",
      applianceKey: "ventilador",
      label: "Desligar o ventilador ao sair do cômodo",
      desc: "Combate o mito de que o ventilador 'esfria o ambiente sozinho'.",
      physics: "Ventiladores não resfriam o ar termicamente; eles resfriam a pele humana pela evaporação do suor (efeito wind-chill). Um ventilador ligado em cômodo vazio apenas aquece o ar pelas perdas do motor elétrico.",
      tip: "Se não tem ninguém no quarto, o ventilador deve ficar desligado.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.75 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "fan_clean_blades",
      applianceKey: "ventilador",
      label: "Limpar poeira das pás da hélice e grades protetoras",
      desc: "Evita arrasto aerodinâmico causado por crostas de poeira nas bordas da hélice.",
      physics: "A poeira acumulada descalibra a aerodinâmica da pá, diminuindo o fluxo de vento e forçando o motor elétrico a operar com mais aquecimento e ruído.",
      tip: "Passe um pano úmido nas pás a cada 15 dias nos meses de calor.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 80) * 0.92)
          : base.powerWatts;
      }
    }
  ],

  // 30. VENTILADOR DE TETO (3 hábitos)
  "ventilador-teto": [
    {
      id: "ceiling_fan_speed_adjust",
      applianceKey: "ventilador-teto",
      label: "Utilizar na velocidade intermediária de ventilação",
      desc: "Proporciona circulação de ar agradável e silenciosa com menor consumo.",
      physics: "Motores de ventiladores de teto utilizam capacitores de partida e derivações de enrolamento; a velocidade máxima consome de 120W a 140W, enquanto a intermediária opera em cerca de 80W a 90W.",
      tip: "Velocidades moderadas também evitam vibrações e ruídos nas pás.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 120) * 0.72)
          : base.powerWatts;
      }
    },
    {
      id: "ceiling_fan_turn_off_idle",
      applianceKey: "ventilador-teto",
      label: "Desligar no interruptor de parede ao sair do recinto",
      desc: "Elimina consumo contínuo em salas e quartos desocupados.",
      physics: "O ventilador de teto move o volume de ar mas não reduz a temperatura de bulbo seco do recinto. Sem pessoas para sentir a brisa, é energia dissipada.",
      tip: "Ao sair do quarto, desligue na caixinha de parede junto com a luz.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "ceiling_fan_reverse_mode",
      applianceKey: "ventilador-teto",
      label: "Usar função exaustão (ar para cima) em noites frescas",
      desc: "Promove circulação suave sem gerar vento direto sobre a cama.",
      physics: "No modo exaustão, as pás empurram o ar para o teto, espalhando o ar fresco pelas laterais e permitindo usar a rotação mínima com menor consumo.",
      tip: "Ideal para noites de sono leve sem sensação de frio excessivo nas costas.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 120) * 0.82)
          : base.powerWatts;
      }
    }
  ],

  // 31. ASPIRADOR DE PÓ (2 hábitos)
  "aspirador": [
    {
      id: "vacuum_empty_bag",
      applianceKey: "aspirador",
      label: "Esvaziar o compartimento de pó ou trocar o saco coletor",
      desc: "Elimina a contrapressão que sobrecarrega a turbina do motor.",
      physics: "Com o filtro ou reservatório saturado, o vácuo cai acentuadamente e o motor gira em rotação forçada sem aspirar direito, dobrando o tempo de limpeza necessário.",
      tip: "Esvazie o recipiente assim que atingir a marca de 2/3 da capacidade.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.75 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "vacuum_targeted_route",
      applianceKey: "aspirador",
      label: "Organizar o ambiente antes de ligar o aspirador",
      desc: "Retira sapatos, brinquedos e cadeiras do caminho antes de acionar o motor de 1.200W.",
      physics: "Evita deixar o motor potente funcionando à toa enquanto você arrasta móveis e tira objetos do chão.",
      tip: "Deixe o chão 100% desimpedido antes de plugar o aparelho na tomada.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    }
  ],

  // 32. BOMBA D'ÁGUA RESIDENCIAL (3 hábitos)
  "bomba": [
    {
      id: "pump_auto_float",
      applianceKey: "bomba",
      label: "Instalar boia de nível automática na caixa superior e cisterna",
      desc: "Evita que a bomba funcione a seco ou transborde água e energia pelo ladrão.",
      physics: "O acionamento por boia eletromecânica ou de nível garante que o motor elétrico de 1/2 CV ligue apenas o tempo estritamente necessário para abastecer o volume consumido.",
      tip: "Boias de nível custam pouco e evitam a queima prematura do motor da bomba.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pump_check_valves",
      applianceKey: "bomba",
      label: "Revisar válvula de retenção de pé para evitar desferra",
      desc: "Impede o retorno da coluna d'água e perda de escorva na tubulação.",
      physics: "Se a válvula de retenção vazar, a tubulação esvazia e a bomba opera com cavitação mecânica puxando ar, gastando energia elétrica sem bombear água.",
      tip: "Verifique a vedação da válvula se a bomba demorar a puxar água na partida.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.2, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pump_night_silent",
      applianceKey: "bomba",
      label: "Programar abastecimento em horários de menor tarifa ou pressão alta",
      desc: "Aproveita a pressão natural da rede pública da rua durante a madrugada.",
      physics: "Quando a rede da distribuidora pública tem maior pressão manométrica na madrugada, a bomba exige menor pressão diferencial para completar a caixa.",
      tip: "Encha a caixa superior nos horários em que a água da rua chega com mais força.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 550) * 0.90)
          : base.powerWatts;
      }
    }
  ],

  // 33. BOMBA DE FILTRAGEM DE PISCINA (4 hábitos)
  "piscina": [
    {
      id: "pool_timer_winter",
      applianceKey: "piscina",
      label: "Reduzir tempo de filtragem no outono/inverno (de 6h para 3h diárias)",
      desc: "Adapta o ciclo de recirculação ao período de baixa proliferação de algas e baixo uso.",
      physics: "A proliferação biológica é proporcional à radiação ultravioleta e à temperatura da água. No inverno, 3 horas diárias são suficientes para filtrar todo o volume cúbico da piscina.",
      tip: "Use um timer no quadro de comando da piscina para automatizar o ciclo.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.55 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pool_backwash_filter",
      applianceKey: "piscina",
      label: "Realizar retrolavagem periódica da areia do filtro",
      desc: "Elimina a saturação de sujeira que eleva a pressão manométrica da bomba.",
      physics: "Um filtro de areia entupido eleva a pressão interna no manômetro (faixa amarela/vermelha), forçando o rotor da bomba a operar em regime de maior atrito e menor vazão útil por Watt consumido.",
      tip: "Faça retrolavagem sempre que o manômetro subir 0,5 kgf/cm² acima do normal.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 550) * 0.90)
          : base.powerWatts;
      }
    },
    {
      id: "pool_thermal_cover",
      applianceKey: "piscina",
      label: "Usar capa térmica protetora sobre a superfície da piscina",
      desc: "Impede a queda de folhas e poeira, reduzindo a necessidade de filtragem mecânica.",
      physics: "A capa bloqueia detritos carreados pelo vento e a radiação direta geradora de algas, cortando a necessidade de horas de motor de filtragem em até 40%.",
      tip: "Ajuda também a manter a água aquecida em piscinas climatizadas.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "pool_skimmer_clean",
      applianceKey: "piscina",
      label: "Limpar o cesto do pré-filtro da bomba e coadeira (skimmer)",
      desc: "Garante fluxo de sucção limpo sem perda de vazão hidráulica.",
      physics: "Folhas no pré-filtro causam perda de sucção e cavitação na voluta da bomba, provocando superaquecimento do motor elétrico.",
      tip: "Esvazie o cestinho plástico toda semana.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 550) * 0.93)
          : base.powerWatts;
      }
    }
  ],

  // 34. CARREGADOR DE VEÍCULO ELÉTRICO / WALLBOX (4 hábitos)
  "carro-eletrico": [
    {
      id: "ev_limit_80_daily",
      applianceKey: "carro-eletrico",
      label: "Limitar a recarga do dia a dia em 80% da bateria",
      desc: "Recarregue apenas a energia necessária para a rotina diária na cidade.",
      physics: "No dia a dia urbano, carregar até 80% repõe os quilômetros rodados sem forçar o carregador desnecessariamente e prolonga a durabilidade da bateria.",
      tip: "Deixe para carregar até 100% apenas na véspera de viagens de estrada longas.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.5, Math.round(base.hoursPerDay * 0.80 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "ev_eco_driving",
      applianceKey: "carro-eletrico",
      label: "Usar condução com frenagem regenerativa no trânsito",
      desc: "Aproveita as descidas e desacelerações para repor carga na bateria.",
      physics: "A frenagem regenerativa transforma o movimento do carro em eletricidade, devolvendo energia à bateria. Isso reduz em cerca de 15% os kWh que você precisará puxar da tomada de casa.",
      tip: "Ative a regeneração no painel do carro para desacelerar com o próprio motor e poupar energia.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.4, Math.round(base.hoursPerDay * 0.85 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "ev_unplug_idle",
      applianceKey: "carro-eletrico",
      label: "Desconectar o cabo após o término da recarga",
      desc: "Evita que a estação e o carro fiquem em vigília consumindo pequenos kWh.",
      physics: "Deixar o veículo plugado por longos períodos após a recarga finalizada mantém módulos eletrônicos e sensores em vigília na tomada, consumindo energia em repouso.",
      tip: "Retire o plugue quando a carga terminar para cessar o consumo em espera.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.3, Math.round(base.hoursPerDay * 0.95 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "ev_moderate_current",
      applianceKey: "carro-eletrico",
      label: "Ajustar corrente para proteção térmica do circuito (Segurança Elétrica)",
      desc: "Evita aquecimento dos fios e desarme do disjuntor da residência durante a recarga.",
      physics: "Ao reduzir a corrente (ex: de 32A para 16A), a potência cai pela metade (P = V × I), mas o tempo de recarga dobra proporcionalmente para repor a mesma carga na bateria (E = P × t). A energia entregue ao veículo é exatamente a mesma. A redução na conta de luz é residual (~R$ 1,50 a R$ 2,50/mês), decorrente unicamente da diminuição do aquecimento por Efeito Joule na fiação predial (R · I²). O benefício real desta medida é segurança elétrica e preservação das instalações.",
      tip: "Recomendado para quadros com fiação antiga ou quando outros aparelhos pesados da casa estiverem em uso no mesmo horário.",
      apply: (app, base, on) => {
        if (on) {
          // A potência cai pela metade (ex: de 7000W para 3500W)
          const basePower = base.powerWatts || 7000;
          app.powerWatts = Math.round(basePower * 0.5);
          // O tempo de recarga dobra proporcionalmente (E = P * t), com sutilíssima redução de ~0.8% devida à menor dissipação nos condutores da residência (~R$ 1,50 a R$ 2,50/mês)
          app.hoursPerDay = Math.round(base.hoursPerDay * 2 * 0.992 * 100) / 100;
        } else {
          app.powerWatts = base.powerWatts;
          app.hoursPerDay = base.hoursPerDay;
        }
      }
    }
  ],

  // 35. SISTEMA AUTOMATIZADO DE IRRIGAÇÃO (2 hábitos)
  "irrigacao": [
    {
      id: "irrig_night_morning",
      applianceKey: "irrigacao",
      label: "Programar irrigação para o início da manhã ou fim de tarde",
      desc: "Evita regar o jardim nos horários de sol forte e calor intenso.",
      physics: "Sob sol a pino, até 40% da água aspergida evapora antes de penetrar no solo. Irrigar à noite ou início da manhã permite reduzir pela metade o tempo de bombeamento com melhor hidratação da grama.",
      tip: "Configure o programador eletrônico para rodar entre 5h e 6h da manhã.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.60 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "irrig_rain_sensor",
      applianceKey: "irrigacao",
      label: "Instalar sensor de chuva ou pausar em dias chuvosos",
      desc: "Bloqueia o acionamento elétrico da bomba de 750W quando já houve precipitação natural.",
      physics: "Regar solo já saturado por chuva causa encharcamento de raízes e desperdício de água e eletricidade de bombeamento.",
      tip: "Sensores de chuva solares desligam o solenoide automaticamente quando detectam umidade.",
      apply: (app, base, on) => {
        app.frequency = on
          ? Math.max(1, Math.round(base.frequency * 0.65))
          : base.frequency;
      }
    }
  ],

  // 36. MÁQUINA DE COSTURA DOMÉSTICA (2 hábitos)
  "maquina-costura": [
    {
      id: "sewing_unplug_idle",
      applianceKey: "maquina-costura",
      label: "Desligar da tomada ou botão ao fazer pausas para corte e marcação",
      desc: "Evita manter o transformador e lâmpada auxiliar ligados sem costurar.",
      physics: "Máquinas eletrônicas mantêm transformador e luz halógena de costura acesa permanentemente enquanto conectadas na tomada.",
      tip: "Use o interruptor lateral sempre que parar para cortar moldes ou alinhavar.",
      apply: (app, base, on) => {
        app.hoursPerDay = on
          ? Math.max(0.1, Math.round(base.hoursPerDay * 0.70 * 10) / 10)
          : base.hoursPerDay;
      }
    },
    {
      id: "sewing_oil_lubricate",
      applianceKey: "maquina-costura",
      label: "Limpar e lubrificar a lançadeira com óleo mineral específico",
      desc: "Reduz o atrito mecânico nas engrenagens rotativas e no pedal do motor.",
      physics: "Engrenagens e lançadeira ressecadas aumentam o torque de atrito do motor elétrico universal, exigindo mais corrente a cada acionamento do pedal.",
      tip: "Aplique uma gotinha de óleo de máquina Singer/mineral a cada mês de uso.",
      apply: (app, base, on) => {
        app.powerWatts = on
          ? Math.round((base.powerWatts || 90) * 0.90)
          : base.powerWatts;
      }
    }
  ]
};

/**
 * Função utilitária para recuperar todos os hábitos de um equipamento
 */
export function getHabitsForAppliance(key: ApplianceKey): ApplianceHabitPreset[] {
  return APPLIANCE_HABITS_CATALOG[key] || [];
}

/**
 * Total de hábitos cadastrados
 */
export function getTotalHabitsCount(): number {
  return Object.values(APPLIANCE_HABITS_CATALOG).reduce((sum, list) => sum + list.length, 0);
}
