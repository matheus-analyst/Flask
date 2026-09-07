"""
App Flask Principal — Blog Ciências Contábeis
Ambiente: Vercel Serverless (Vercel Functions + Python Runtime)
"""
app = Flask(__name__)
from flask import Flask, jsonify, request, render_template
import os

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "..", "static"),
)

ADMIN_PASSWORD = "123456"

# ---------------------------------------------------------------------------
# Persistência em memória (Volátil por natureza do ambiente Serverless)
# ---------------------------------------------------------------------------
posts = [
    {
        "id": 1,
        "titulo": "Exame do CFC 2025: Guia Definitivo de Aprovação",
        "categoria": "Concursos & Certificação",
        "conteudo": "O Exame de Suficiência do Conselho Federal de Contabilidade (CFC) é a porta de entrada final para o registro profissional do contador. Neste guia abordamos a estrutura P1 e P2, as disciplinas de Contabilidade Geral, Gerencial e Legislação Aplicada. Estratégias de estudo focadas em resolução de provas anteriores são essenciais para a matemática do sucesso contábil.",
        "curtidas": 42,
        "comentarios": [
            {"id": 1, "nome": "Ana beatriz", "texto": "Conteúdo muito esclarecedor! Vou aplicar na minha reta final."}
        ],
    },
    {
        "id": 2,
        "titulo": "Balanço Patrimonial: Desmistificando o Ativo, Passivo e PL",
        "categoria": "Contabilidade Geral",
        "conteudo": "O Balanço Patrimonial é a fotografia da empresa em um determinado tempo. Entender a dinâmica dos grupos de Ativo Circulante e Não-Circulante versus Passivo Contábil e Patrimônio Líquido é a base para qualquer análise financeira sólida no mundo moderno das Ciências Contábeis.",
        "curtidas": 78,
        "comentarios": [
            {"id": 1, "nome": "Rafael Lima", "texto": "Excelente didática para entender a equação fundamental!"}
        ],
    },
]


# ---------------------------------------------------------------------------
# Frontend Renderizado (Índice HTML)
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------------
# Rotas REST API
# ---------------------------------------------------------------------------
@app.route("/api/posts", methods=["GET"])
def get_posts():
    return jsonify(posts)


@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Payload JSON inválido."}), 400
    if data.get("senha") != ADMIN_PASSWORD:
        return jsonify({"error": "Acesso administrativo negado."}), 401

    titulo = data.get("titulo", "").strip()
    categoria = data.get("categoria", "").strip()
    conteudo = data.get("conteudo", "").strip()

    if not titulo or not conteudo:
        return jsonify({"error": "Campos 'titulo' e 'conteudo' são obrigatórios."}), 400

    novo_id = max([p["id"] for p in posts], default=0) + 1
    novo_post = {
        "id": novo_id,
        "titulo": titulo,
        "categoria": categoria if categoria else "Geral",
        "conteudo": conteudo,
        "curtidas": 0,
        "comentarios": [],
    }
    posts.append(novo_post)
    return jsonify({"message": "Artigo publicado com sucesso!", "post": novo_post}), 201


@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id):
    for p in posts:
        if p["id"] == post_id:
            p["curtidas"] += 1
            return jsonify({"message": "Curtida registrada!", "curtidas": p["curtidas"]})
    return jsonify({"error": "Post não encontrado."}), 404


@app.route("/api/posts/<int:post_id>/comment", methods=["POST"])
def comment_post(post_id):
    data = request.get_json(silent=True) or {}
    nome = data.get("nome", "").strip()
    texto = data.get("texto", "").strip()

    if not nome or not texto:
        return jsonify({"error": "Campos 'nome' e 'texto' são obrigatórios."}), 400

    for p in posts:
        if p["id"] == post_id:
            novo_comentario = {
                "id": len(p["comentarios"]) + 1,
                "nome": nome,
                "texto": texto,
            }
            p["comentarios"].append(novo_comentario)
            return jsonify({"message": "Comentário adicionado!", "comentarios": p["comentarios"]})
    return jsonify({"error": "Post não encontrado."}), 404


@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    data = request.get_json(silent=True) or {}
    if data.get("senha") != ADMIN_PASSWORD:
        return jsonify({"error": "Acesso administrativo negado."}), 401

    global posts
    initial_len = len(posts)
    posts = [p for p in posts if p["id"] != post_id]
    if len(posts) == initial_len:
        return jsonify({"error": "Post não encontrado."}), 404
    return jsonify({"message": "Post removido com sucesso."})


# Exposição correta para o Runtime Serverless da Vercel
handler = app
