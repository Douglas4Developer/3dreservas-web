import type { ContractClause, ContractTermsJson } from '../types/database'

export const DEFAULT_LESSOR_NAME = 'Douglas Soares de Souza Ferreira'
export const DEFAULT_LESSOR_DOCUMENT = '708.321.121-35'
export const DEFAULT_LESSOR_ADDRESS = 'Estrada 114 QD3 LT 13, Chácara São Joaquim, Goiânia - GO'
export const DEFAULT_FORUM_CITY = 'Goiânia - GO'

export const DEFAULT_CONTRACT_TITLE = 'CONTRATO DE LOCAÇÃO DE ESPAÇO PARA EVENTOS – 3DEventos'

export const DEFAULT_CONTRACT_INTRO =
  'As partes acima qualificadas firmam o presente contrato de locação do espaço para eventos “3DEventos”, mediante as cláusulas seguintes:'

export const DEFAULT_CONTRACT_CLAUSES: ContractClause[] = [
  {
    title: 'CLÁUSULA 1 - OBJETO',
    body:
      '1.1 O presente contrato tem como objeto a locação do espaço físico 3DEventos, localizado na Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia – GO, para realização do evento informado na reserva.',
  },
  {
    title: 'CLÁUSULA 2 - PRAZO DE LOCAÇÃO',
    body:
      '2.1 A locação será válida por tempo determinado, com início e término conforme data, horário e período informados na reserva vinculada a este contrato.',
  },
  {
    title: 'CLÁUSULA 3 - VALOR E FORMA DE PAGAMENTO',
    body:
      '3.1 O valor total da locação será o valor informado na reserva, pago conforme entrada/sinal de reserva e saldo restante definidos no momento da contratação.\n\n3.2 O não pagamento de qualquer parcela no prazo implicará multa de 2% e juros de mora de 1% ao mês.\n\n3.3 Em caso de desistência por parte do LOCATÁRIO, será devida multa compensatória mínima de 30% (trinta por cento) sobre o valor total contratado, a título de reserva da data, despesas e impossibilidade de nova locação. Os valores eventualmente já pagos pelo LOCATÁRIO serão retidos e imputados ao pagamento dessa multa, sem devolução; caso o montante pago seja inferior a 30% do valor total, o LOCATÁRIO se obriga a quitar a diferença.',
  },
  {
    title: 'CLÁUSULA 3.1 – DA DESISTÊNCIA E NÃO DEVOLUÇÃO DE VALORES',
    body:
      'Em caso de desistência por parte do(a) LOCATÁRIO(A), não haverá devolução de qualquer valor já pago, seja a título de entrada, sinal, reserva ou pagamento total, independentemente do motivo apresentado. Caso o evento seja contratado para mais de um dia e o(a) LOCATÁRIO(A) opte por cancelar ou não utilizar um ou mais dias após o início do evento, não será devida qualquer restituição ou compensação. Da mesma forma, se o(a) LOCATÁRIO(A) desistir após a realização parcial do evento, ou se o evento for interrompido por motivos alheios ao LOCADOR, os valores pagos permanecerão integralmente devidos, a título de indenização pelas despesas, bloqueio da data e impossibilidade de nova locação do espaço no período.',
  },
  {
    title: 'CLÁUSULA 3.2 – DO CANCELAMENTO POR PARTE DO LOCADOR',
    body:
      'Em caso de cancelamento da locação por iniciativa do LOCADOR, por motivo que impeça a realização do evento na data acordada, este se compromete a restituir integralmente ao(à) LOCATÁRIO(A) todos os valores já pagos, incluindo sinal, entrada ou pagamento total.',
  },
  {
    title: 'CLÁUSULA 4 - USO DO ESPAÇO',
    body:
      '4.1 A capacidade máxima do local é de 100 pessoas.\n\n4.2 É proibida a sublocação, cessão, empréstimo ou transferência deste contrato/da data para terceiros, bem como a cobrança de ingressos, entradas, convites pagos ou qualquer forma de exploração comercial do evento sem autorização prévia e expressa do LOCADOR.\n\n4.3 O LOCATÁRIO deverá utilizar o espaço de forma adequada, respeitando a estrutura, os horários contratados, as orientações do LOCADOR/representante e todas as regras previstas neste contrato.',
  },
  {
    title: 'CLÁUSULA 4.1 - SOM, HORÁRIO E PERTURBAÇÃO DO SOSSEGO',
    body:
      'O som deverá ser utilizado exclusivamente pelo sistema do espaço, composto por 4 caixas de som ambiente JBL, com conexão Bluetooth. É proibido som automotivo e a entrada/instalação de som externo, incluindo paredões, caixas amplificadas, DJ ou equipamentos semelhantes, salvo autorização prévia e expressa do LOCADOR.\n\nO LOCATÁRIO compromete-se a respeitar os limites legais de volume e horário do som, conforme a legislação municipal, estadual e federal, especialmente as normas do Município de Goiânia sobre perturbação do sossego, inclusive no período noturno e de madrugada. O descumprimento implicará responsabilidade integral do LOCATÁRIO por quaisquer multas, sanções ou penalidades, não recaindo ao LOCADOR qualquer ônus ou responsabilidade.',
  },
  {
    title: 'CLÁUSULA 4.2 - ITENS E ESTRUTURA DISPONIBILIZADOS',
    body:
      'O LOCADOR disponibiliza ao LOCATÁRIO, para uso durante o período de locação, os seguintes itens e estruturas, em condições de uso, salvo ressalvas registradas na entrega: espaço físico com 3 quartos, sala com sofá, cozinha e 2 banheiros; acomodação com 1 cama e 19 colchonetes; área gourmet com churrasqueira e aparador; piscina coberta e aquecida, com cascata e 2 hidros; mobiliário com 10 mesas e cadeiras; cozinha/equipamentos com 2 fogões industriais, 1 cooktop, geladeira e freezer; serviços/itens com Wi-Fi e som ambiente com 4 caixas JBL Bluetooth.',
  },
  {
    title: 'CLÁUSULA 4.3 - RESCISÃO OU ENCERRAMENTO POR DESCUMPRIMENTO',
    body:
      'O descumprimento de quaisquer regras deste contrato, incluindo, mas não se limitando, a confusão generalizada, brigas, danos, prática de atos ilícitos, desobediência a orientações do LOCADOR/representante ou uso de som em desacordo com o permitido, autoriza o LOCADOR a encerrar imediatamente o evento e/ou rescindir a locação, com retirada dos presentes, sem devolução de valores pagos e sem prejuízo da cobrança de danos, multas, taxas e demais prejuízos eventualmente apurados.',
  },
  {
    title: 'CLÁUSULA 4.4 - PISCINA, ÁREAS MOLHADAS E SEGURANÇA',
    body:
      'É proibido o uso de substâncias inflamáveis. O uso da piscina e áreas molhadas é de inteira responsabilidade do LOCATÁRIO e de seus convidados, devendo ser observadas as regras de segurança. Crianças e adolescentes somente poderão permanecer na área da piscina sob supervisão de responsável. É proibido o uso de vidros, garrafas, copos e similares na área da piscina. Também é proibido correr, empurrar, mergulhar em local raso ou praticar condutas de risco. Qualquer acidente decorrente de imprudência, negligência, imperícia ou desrespeito às regras e orientações do LOCADOR/representante será suportado pelo LOCATÁRIO, isentando o LOCADOR de responsabilidade civil por tais ocorrências.',
  },
  {
    title: 'CLÁUSULA 4.5 - LIMPEZA, EQUIPAMENTOS DE TERCEIROS E HORÁRIO ADICIONAL',
    body:
      'O espaço será entregue limpo e deverá ser devolvido nas mesmas condições; caso contrário, será cobrada taxa de limpeza no valor de R$ 100,00.\n\nCaso o LOCATÁRIO contrate ou leve para o evento mesas, cadeiras, brinquedos, estruturas, som, decoração ou quaisquer equipamentos de terceiros, deverá informar previamente ao LOCADOR, com antecedência mínima de 24 horas, indicando o que será levado e o responsável pela entrega/retirada. Tais itens deverão ser retirados integralmente até o horário final da locação/devolução das chaves, não sendo permitido deixar materiais no local para retirada posterior, a fim de não prejudicar a organização e/ou a locação do dia seguinte.\n\nA diária encerra-se às 23:00hs. Caso o LOCATÁRIO deseje permanecer no espaço por mais tempo, o horário adicional somente poderá ocorrer mediante anuência prévia do LOCADOR e desde que não haja locação no dia posterior, devendo o LOCATÁRIO respeitar os limites legais de som e as regras deste contrato. Nessa hipótese, será devido o valor de R$ 100,00 por hora adicional ou fração. Permanecendo itens de terceiros no local após o término sem autorização, será cobrada taxa de permanência/armazenamento de R$ 100,00 por hora ou fração, até a retirada, sem prejuízo de eventual cobrança por limpeza, danos ou ocupação indevida.',
  },
  {
    title: 'CLÁUSULA 4.6 - DANOS, EXTRAVIOS E RESSARCIMENTO',
    body:
      'Danos causados ao imóvel, mobiliário, equipamentos e demais bens do espaço, bem como extravio de itens, serão de responsabilidade do LOCATÁRIO, que se compromete a ressarcir o LOCADOR pelos prejuízos apurados, incluindo custos de reparo, reposição e/ou limpeza extraordinária, mediante apresentação de orçamento, nota fiscal ou comprovante equivalente, no prazo de até 5 (cinco) dias úteis após a comunicação. Caso existam valores pendentes da locação, o LOCADOR poderá abatê-los do montante devido, sem prejuízo de eventual cobrança complementar.',
  },
  {
    title: 'CLÁUSULA 5 - RESPONSABILIDADE',
    body:
      'O LOCATÁRIO é responsável por todos os participantes do evento, bem como por qualquer ato que resulte em danos ou infrações legais.',
  },
  {
    title: 'CLÁUSULA 6 - DISPOSIÇÕES GERAIS',
    body:
      '6.1 O LOCATÁRIO autoriza o uso de imagens do evento para fins de divulgação nas redes sociais do 3DEventos, salvo oposição expressa.\n\n6.2 Fica eleito o foro da comarca de Goiânia Goiás para dirimir quaisquer dúvidas oriundas deste contrato.',
  },
]

export const DEFAULT_CONTRACT_TERMS: ContractTermsJson = {
  contract_title: DEFAULT_CONTRACT_TITLE,
  intro_text: DEFAULT_CONTRACT_INTRO,
  show_default_clauses: false,
  custom_clauses: DEFAULT_CONTRACT_CLAUSES,
}

export function cloneDefaultContractTerms(): ContractTermsJson {
  return {
    ...DEFAULT_CONTRACT_TERMS,
    custom_clauses: DEFAULT_CONTRACT_CLAUSES.map((clause) => ({ ...clause })),
  }
}


export function buildContractTermsPlainText(terms: ContractTermsJson = cloneDefaultContractTerms()) {
  const clauses = terms.custom_clauses?.length ? terms.custom_clauses : DEFAULT_CONTRACT_CLAUSES

  return [
    terms.contract_title || DEFAULT_CONTRACT_TITLE,
    terms.intro_text || DEFAULT_CONTRACT_INTRO,
    ...clauses.map((clause) => `${clause.title}\n${clause.body}`),
    `Foro eleito: ${DEFAULT_FORUM_CITY}.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildContractTermsHtmlFragment(terms: ContractTermsJson = cloneDefaultContractTerms()) {
  const clauses = terms.custom_clauses?.length ? terms.custom_clauses : DEFAULT_CONTRACT_CLAUSES
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const paragraphs = (value: string) =>
    value
      .split(/\n{2,}/g)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br />')}</p>`)
      .join('')

  return `
    <style>
      .contract-generated-document{font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:12px;line-height:1.55;}
      .contract-generated-document h1{text-align:center;font-size:18px;margin:0 0 18px;text-transform:uppercase;}
      .contract-generated-document h2{font-size:14px;margin:18px 0 8px;text-transform:uppercase;page-break-after:avoid;}
      .contract-generated-document p{margin:0 0 8px;text-align:justify;}
      .contract-generated-document section{margin-bottom:14px;page-break-inside:auto;break-inside:auto;}
    </style>
    <article class="contract-generated-document">
      <h1>${escape(terms.contract_title || DEFAULT_CONTRACT_TITLE)}</h1>
      <p>${escape(terms.intro_text || DEFAULT_CONTRACT_INTRO)}</p>
      ${clauses.map((clause) => `<section><h2>${escape(clause.title)}</h2>${paragraphs(clause.body)}</section>`).join('')}
      <p><strong>Foro eleito:</strong> ${escape(DEFAULT_FORUM_CITY)}.</p>
    </article>
  `
}
