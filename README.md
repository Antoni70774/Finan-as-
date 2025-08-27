# FinApp — Vite + React + TypeScript + Tailwind

App de finanças pessoais para demonstrar:
- Início: cartões (Receita, Despesa, Balanço). Ao clicar em Receita/Despesa abre modal com lançamentos, permitindo alterar e excluir.
- Gráfico categorizado (despesas) e resumo por categoria com ícones.
- Metas: meta com valor do bem, valor já conquistado (%), barra de progresso e previsão simples.
- Perfil: dados do usuário logado (mock), conexões Open Finance (placeholders) e outras funções.

## Executar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

- `src/pages/Home.tsx` — dashboard com cartões, modal de lançamentos, gráfico e resumo.
- `src/pages/Metas.tsx` — metas com progresso.
- `src/pages/Perfil.tsx` — perfil, conexões e ações extras.
- `src/lib/data.ts` — dados de exemplo (substitua por API/BD).
- `src/components/*` — componentes reutilizáveis.
- Tailwind já configurado em `tailwind.config.js` e `src/styles.css`.

> Observação: Integrações com login real, bancos (Open Finance) e persistência devem ser adicionadas depois, trocando `data.ts` por sua API.
