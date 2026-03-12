# Patch de correção - 3DReservas

## O que foi corrigido

### 1. Botão de pagamento manual
O problema vinha de HTML inválido: havia um `<button>` dentro de outro `<button>` em `ReservationsPage.tsx`.

Com isso, ao clicar em **Confirmar entrada manual**, o clique também acabava disparando o botão externo de **Gerar checkout**.

Agora os dois botões estão separados.

### 2. Calendário público
O calendário do cliente agora mostra apenas:
- Disponível
- Reservado

Status internos como:
- interesse_enviado
- bloqueio_temporario
- aguardando_pagamento
- cancelado

não aparecem mais para o cliente.

### 3. Calendário administrativo
Foi criada uma página nova:
- `/admin/calendario`

Ela mostra todos os status internos para uso operacional.

## Arquivos principais
- `src/pages/admin/ReservationsPage.tsx`
- `src/services/calendar.service.ts`
- `src/components/calendar/PublicCalendar.tsx`
- `src/components/calendar/AdminCalendar.tsx`
- `src/pages/public/AvailabilityPage.tsx`
- `src/pages/admin/CalendarPage.tsx`
- `src/App.tsx`
- `supabase/migrations/20260312_public_admin_calendar_adjustments.sql`

## O que aplicar
1. Substitua os arquivos da pasta `src` pelos equivalentes deste patch.
2. Rode a migration SQL no Supabase.
3. Refaça o build local.
4. Faça novo deploy na Vercel.
