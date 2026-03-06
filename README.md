# Save Comercial - Gerador de Propostas

Sistema web local para emissão de propostas comerciais de:

- Análise da Qualidade do Ar (QAR)
- Análise de Potabilidade da Água
- Análise de Legionella

O sistema foi estruturado com base no conteúdo das propostas fornecidas e permite gerar uma proposta pronta para impressão/PDF.
O escopo de Qualidade do Ar foi atualizado conforme modelo mais recente (PC704/2026.1), com referência à ABNT NBR 17037:2023.
Os escopos de Legionella e Potabilidade foram atualizados com base no modelo PC670/2026.1.

## Como usar

1. Abra o arquivo `/Users/marcelstella/Documents/programacao/SaveComercial/index.html` no navegador.
2. Preencha os dados da proposta e do cliente.
3. Adicione os itens desejados (serviços, quantidade, valor unitário, custos internos e descrição).
4. Use **Salvar proposta** para persistir (local e Supabase, se configurado).
5. Clique em **Gerar proposta** e depois **Imprimir / Salvar PDF** para exportar.
6. Para criar uma nova do zero, use **Nova proposta** (o número é gerado automaticamente).
7. Para alterar uma já existente, use a seção **Edição da proposta** e clique em **Atualizar proposta**.

## Funcionalidades

- Formulário único com dados comerciais e técnicos
- Geração automática do número da proposta (sequencial por ano)
- Itens com tipo de serviço e descrições padrão automáticas
- Escopo técnico montado automaticamente pelos tipos selecionados
- Cálculo automático de custos internos e margem:
  - custo fornecedor unitário (por item)
  - logística/deslocamento (por item)
  - envio de amostra (por item)
  - imposto (%) sobre receita bruta
  - comissão (%) sobre receita bruta
- Dashboard com:
  - propostas convertidas e não convertidas
  - taxa de conversão por quantidade e por valor
  - receita, custos internos, lucro líquido e margem média
- Exportação e importação em JSON para reaproveitar propostas
- Persistência local em `localStorage` com abertura de propostas recentes
- Área de edição com seleção de propostas salvas para carregar e atualizar
- Sincronização manual e automática com Supabase (quando configurado)
- Integração opcional com Supabase para salvar `clients`, `proposals` e `proposal_items`

## Estrutura

- `/Users/marcelstella/Documents/programacao/SaveComercial/index.html`: interface
- `/Users/marcelstella/Documents/programacao/SaveComercial/styles.css`: estilo e layout de impressão
- `/Users/marcelstella/Documents/programacao/SaveComercial/script.js`: regras de negócio e geração da proposta
- `/Users/marcelstella/Documents/programacao/SaveComercial/supabase/schema.sql`: schema SQL do Supabase

## Configuração Supabase (opcional)

1. No editor do projeto Supabase, execute:
   - `/Users/marcelstella/Documents/programacao/SaveComercial/supabase/schema.sql`
2. Defina as credenciais no `index.html` antes de `script.js`, por exemplo:

```html
<script>
  window.SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
  window.SUPABASE_ANON_KEY = "SUA_ANON_KEY";
  window.SAVE_LOGO_URL = "/caminho/absoluto/para/logo.png";
</script>
```

Sem essas variáveis, o sistema funciona normalmente com persistência local.

## Observações

- Os custos internos não são exibidos na proposta comercial/PDF.
- Os textos técnicos padrão de cada serviço podem ser ajustados no campo de descrição dos itens e observações gerais, caso cada cliente exija um escopo específico.
