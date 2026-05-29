# Portal Janela Pop

Site gratuito inicial para transformar noticias, teorias e tendencias internacionais em posts do Janela Pop.

## O que tem nesta primeira versao

- Home com visual de portal de cultura pop.
- Categorias para From, Terror, Series, Filmes, Teorias, Trailers e Reviews.
- Destaque principal na home.
- Pagina de categoria por assunto.
- Painel editorial em `admin.html`.
- Posts em arquivos Markdown.
- Pagina de materia.
- Busca simples.
- Identidade visual com artes do Janela Pop.
- Estrutura pronta para conectar com radar de noticias e aprovacao via Telegram.

## Como rodar

Abra o terminal nesta pasta e rode:

```bash
npm.cmd run dev
```

Depois acesse:

```text
http://localhost:4321
```

## Como criar uma noticia

Crie um arquivo dentro de `posts`, por exemplo:

```text
posts/from-nova-teoria.md
```

Use este modelo:

```md
---
title: "Titulo da materia"
slug: "titulo-da-materia"
category: "From"
date: "2026-05-29"
image: "/assets/hero-janela-pop.png"
excerpt: "Resumo curto da materia."
source: "Fonte acompanhada pelo radar"
---

## Subtitulo

Texto da noticia em portugues do Brasil.
```

Depois adicione o nome do arquivo na lista `postFiles` em `scripts/site.js`.

## Como buscar noticias candidatas

Rode:

```bash
npm.cmd run radar
```

O radar procura pautas recentes sobre From em fontes internacionais e comunidades. Quando encontra uma pauta forte, ele salva em:

```text
data/candidatos.json
```

Se houver imagem na fonte, ela tambem fica salva no candidato e pode virar imagem destacada da materia.

## Como aprovar uma noticia

Pegue o codigo do candidato, por exemplo:

```text
jp-123abc
```

Depois rode:

```bash
npm.cmd run aprovar -- jp-123abc
```

Isso cria automaticamente um post em `posts` e adiciona a materia na home do site.

## Proximos passos

- Automatizar criacao de posts aprovados pelo Telegram.
- Publicar gratuitamente no Cloudflare Pages ou GitHub Pages.
- Criar pagina por categoria.
- Criar painel editorial simples.
- Adicionar imagens destacadas por materia.
- Conectar com o radar de noticias do Janela Pop.
