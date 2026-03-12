# 3DReservas Web

Base web do sistema **3DReservas**, desenhada para operar o espaço **3Deventos** com foco em baixo custo, simplicidade e crescimento gradual.

## 1. Visão geral técnica do produto

O 3DReservas é uma aplicação web com duas frentes principais:

- **site público** para exibir disponibilidade e captar interessados
- **painel administrativo** para operar leads, reservas, pagamentos e contratos

A proposta técnica do MVP é usar uma arquitetura enxuta:

- **Frontend:** React + Vite + TypeScript
- **BaaS:** Supabase
- **Banco:** PostgreSQL gerenciado pelo Supabase
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Deploy:** Vercel

Essa combinação reduz o custo inicial, evita a necessidade de manter um backend Node dedicado logo no começo e ainda deixa o sistema preparado para Edge Functions, webhook de pagamentos, WhatsApp e PDFs no futuro.

## 2. Módulos do sistema

### Público
- calendário de disponibilidade
- formulário de interesse
- página de consulta segura da reserva

### Administrativo
- autenticação do administrador
- dashboard com KPIs operacionais
- gestão de interesses
- gestão de reservas
- gestão de contratos

### Evolução futura
- pagamentos automáticos
- assinatura digital com evidências
- integração de WhatsApp
- geração de PDF server-side
- CRM e automações comerciais

## 3. Perfis de usuário

- **visitante:** consulta calendário e envia interesse
- **cliente com reserva em andamento:** acessa link seguro para acompanhar status
- **administrador:** gerencia leads, agenda, pagamentos e contratos

## 4. Regras de negócio centrais

- uma mesma data não pode ter duas reservas ativas
- bloqueio temporário deve impedir nova negociação no período
- reserva só vira confirmada após pagamento confirmado
- contrato só deve ficar disponível após regra de negócio correspondente
- consulta do cliente deve usar token seguro
- mudanças de status precisam ser auditáveis no banco

## 5. Integrações externas previstas

- **Supabase Auth** para login do administrador
- **Supabase Database** para agenda e operação
- **Supabase Storage** para contratos e anexos
- **Mercado Pago / Pix** para entrada da reserva
- **WhatsApp API** para mensagens automáticas
- **Edge Functions** para webhooks e automações

## 6. Riscos técnicos e de negócio

- conflito de agenda sem índice único ou sem RLS bem configurado
- uso incorreto da `service_role` no frontend
- falta de política de expiração de bloqueio temporário
- dependência de processos manuais em pagamentos no MVP
- crescimento desorganizado sem separar domínio público e administrativo

## 7. MVP recomendado

### MVP enxuto
- calendário público
- envio de interesse
- login do admin
- dashboard operacional
- cadastro manual de reservas
- consulta de contrato/reserva por token

### Visão futura
- checkout automático
- webhook de pagamento
- expiração automática de propostas
- assinatura digital completa
- dashboards analíticos e projeções
- multi-espaço / multiunidade

## 8. Comparação técnica da stack

### 1. React + Supabase
**Prós**
- backend pronto
- PostgreSQL relacional
- Auth e Storage embutidos
- menor tempo de implementação
- custo inicial baixo

**Contras**
- depende de modelagem e RLS bem feitas
- lógica muito complexa pode exigir Edge Functions

**Custo inicial estimado**
- gratuito ou muito baixo no MVP

**Manutenção**
- baixa a média

### 2. React + Firebase
**Prós**
- boa experiência para realtime
- setup simples

**Contras**
- Firestore é menos natural para regras relacionais de reservas e contratos
- consultas mais complexas podem ficar mais chatas

**Custo inicial estimado**
- baixo, mas cresce com uso

### 3. React + Node.js + PostgreSQL
**Prós**
- máximo controle arquitetural
- regras complexas totalmente centralizadas

**Contras**
- maior tempo de entrega
- mais custo operacional
- exige deploy separado do backend

**Custo inicial estimado**
- médio

### 4. React + Next.js + Supabase
**Prós**
- SSR e rotas server úteis para expansão futura
- muito bom para site + painel

**Contras**
- mais complexidade do que o MVP precisa hoje
- curva um pouco maior se a meta é começar rápido

**Custo inicial estimado**
- baixo a médio

### Escolha final para o MVP
**React + Supabase + Vercel**

É a melhor escolha porque combina:
- menor custo
- menor tempo de entrega
- banco relacional mais adequado ao problema
- autenticação pronta
- storage e automação futura no mesmo ecossistema

## 9. Arquitetura em camadas

### Camada de apresentação
- React público
- React admin

### Camada de acesso a dados
- services do frontend consumindo Supabase

### Camada de plataforma
- Auth
- Database
- Storage
- RPC / Edge Functions

### Camada de persistência
- PostgreSQL com RLS e índices de integridade

## 10. C4 textual simplificado

### Contexto
- **Visitante** usa o site público
- **Administrador** usa o painel interno
- **Supabase** fornece auth, banco e storage
- **Vercel** publica o frontend
- **Gateway de pagamento** confirma entrada
- **WhatsApp** entrega notificações

### Containers
- **Web Público (React/Vite):** calendário, interesse e consulta por token
- **Admin Web (React/Vite):** dashboard, leads, reservas e contratos
- **Supabase Database:** agenda, reservas, pagamentos, contratos e histórico
- **Supabase Auth:** login do administrador
- **Supabase Storage:** contratos e comprovantes
- **Edge Functions futuras:** PDF, webhook e automações

## 11. Estrutura de pastas

```text
src/
  components/
    calendar/
    layout/
    ui/
  context/
  lib/
  pages/
    admin/
    public/
  routes/
  services/
  types/
```

## 12. Passo a passo para rodar no VSCode

### 12.1 Instalar dependências
```bash
npm install
```

### 12.2 Criar `.env.local`
```env
VITE_SUPABASE_URL=https://SEU-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_AQUI
```

### 12.3 Rodar local
```bash
npm run dev
```

## 13. Passo a passo completo da Vercel

### 13.1 Subir para o GitHub
```bash
git init
git add .
git commit -m "feat: base web do 3dreservas"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

### 13.2 Importar na Vercel
1. abra a Vercel
2. clique em **Add New > Project**
3. conecte o GitHub
4. escolha o repositório `3dreservas-web`
5. deixe a Vercel detectar Vite automaticamente

### 13.3 Confirmar as configs
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 13.4 Variáveis de ambiente
Cadastre na Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Adicione nos três ambientes:
- Development
- Preview
- Production

### 13.5 Rewrites para SPA
Este projeto já inclui `vercel.json` para evitar erro 404 ao atualizar rotas como `/admin` ou `/disponibilidade`.

### 13.6 Deploy
Clique em **Deploy**.

Depois do primeiro deploy, cada push no GitHub gera nova versão automaticamente.

## 14. Serviços gratuitos ou baratos recomendados

- **Frontend:** Vercel
- **Banco/Auth/Storage:** Supabase
- **Domínio:** opcional no início
- **PDF e webhooks:** Supabase Edge Functions futuramente

## 15. Limitações do plano gratuito

- limites de banco e banda
- pausa do projeto em inatividade conforme política vigente do provedor
- recursos de Edge Functions e realtime com franquias limitadas

## 16. Observação importante

Esta base está pronta para o **web** e funciona de forma coerente com o schema Supabase que foi proposto antes. Ela não usa a `service_role` no navegador e inclui um **modo demonstração** quando o `.env.local` ainda não foi configurado, facilitando a visualização do fluxo completo no VSCode.
