# Patch de correções

## O que foi corrigido
- formulário de demonstrar interesse voltou a ficar visível e funcional
- calendário público mostra apenas disponível e reservado
- novo calendário administrativo com todos os status
- botão de confirmar entrada manual separado do checkout
- invoke de Edge Function agora envia o access token do usuário autenticado
- contratos agora podem ser gerados mesmo quando ainda não existe linha em `contracts`
- melhorias de responsividade para mobile
- aviso importante na tela de mídia: subir arquivo no bucket não basta sem registro em `space_media`

## Observação sobre galeria
A galeria lê a tabela `space_media`. Se você subir imagem diretamente no bucket, sem criar o registro nessa tabela, ela não aparece.
