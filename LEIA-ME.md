# Gerador de Imagem de Tabela (microserviço)

Sua "QuickChart privada": recebe dados de tabela, devolve PNG renderizado.
Determinístico — os números são SEMPRE exatos (sem IA, sem alucinação).

## Instalação (no seu servidor)

1. Copie a pasta `tabela-img/` para o servidor, ao lado do `docker-compose.yml`.

2. Abra `docker-compose.snippet.yml`, copie o bloco do serviço `tabela-img:`
   e cole dentro de `services:` no SEU docker-compose.yml (junto do n8n).
   Garanta que os dois estão na MESMA network.

3. Suba o serviço:
       docker compose up -d --build tabela-img

4. Teste se subiu:
       docker compose logs tabela-img        # deve mostrar "rodando na porta 3000"

5. (Opcional) teste a geração de fora, se expôs a porta 3001:
       curl -X POST http://localhost:3001/tabela \
         -H 'content-type: application/json' \
         -d @exemplo-payload.json -o teste.png
   Abra teste.png e veja a tabela.

## Como o n8n chama

URL interna (n8n -> serviço, mesma rede Docker):
    http://tabela-img:3000/tabela

Método: POST | Body JSON:
{
  "titulo": "Legumes — Segunda 15/06",
  "subtitulo": "Ceasa-ES (ref. 14/06)",
  "colunas": ["Produto", "Preço (R$)", "Var."],
  "linhas": [
    { "Produto": "Tomate 1ª", "Preço (R$)": "45,00–60,00/cx", "Var.": "+14,2%" }
  ],
  "marca": "NF Fácil Rural",
  "corHeader": "#15803d"
}

Resposta: o PNG (image/png) direto no corpo.
No node HTTP Request do n8n, use Response Format = File, campo "data".
