var client = ClientSubapase.getClient();
$("#menu").load("menu.html");

// Verificar grupo do usuário logado
async function verificarGrupoUsuario() {
  let u = await ClientSubapase.getUser();
  if (u) {
    const email = u.email;

    // Buscar o grupo do usuário logado no banco
    const { data: usuario, error } = await client
      .from("usuarios")
      .select("grupo")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Erro ao buscar o grupo do usuário:", error);
      return null;
    }

    return usuario.grupo;
  }
  return null;
}

async function loadUsuarios() {
  // Busca todos os usuários
  const { data, error } = await client
    .from("usuarios")
    .select("id, nome, email, grupo, ra, desmarcacoes");

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    alert("Erro ao carregar usuários.");
    return; // Para garantir que não prosseguimos se houve erro
  }

  // Verifica se o usuário logado é um administrador
  const u = await ClientSubapase.getUser();
  const { data: usuarioLogado } = await client
    .from("usuarios")
    .select("grupo")
    .eq("email", u.email)
    .single();

  const isAdmin = usuarioLogado.grupo === "administrador";

  // Limpa o conteúdo atual
  const listContainer = $("#usuario-list");
  listContainer.empty();

  if (isAdmin) {
    // Se o usuário for administrador, separa os usuários em dois grupos
    const professores = data.filter((usuario) => usuario.grupo === "professor");
    const administradores = data.filter(
      (usuario) => usuario.grupo === "administrador"
    );

    // Exibe professores
    if (professores.length > 0) {
      listContainer.append("<h2>Professores</h2>");
      professores.forEach((usuario) => {
        const usuarioHtml = displayUsuario(usuario, isAdmin);
        listContainer.append(usuarioHtml);
      });
    } else {
      listContainer.append("<p>Nenhum professor encontrado.</p>");
    }

    // Exibe administradores
    if (administradores.length > 0) {
      listContainer.append("<h2>Administradores</h2>");
      administradores.forEach((usuario) => {
        const usuarioHtml = displayUsuario(usuario, isAdmin);
        listContainer.append(usuarioHtml);
      });
    } else {
      listContainer.append("<p>Nenhum administrador encontrado.</p>");
    }
  } else {
    // Se o usuário for professor, exibe apenas ele mesmo
    const usuarioProfessor = data.find((usuario) => usuario.email === u.email);
    if (usuarioProfessor) {
      const usuarioHtml = displayUsuario(usuarioProfessor, isAdmin);
      listContainer.append(usuarioHtml);
    } else {
      listContainer.append("<p>Nenhum usuário encontrado.</p>");
    }
  }
}

function displayUsuario(usuario, isAdmin) {
  const usuarioItem = `
        <div class="usuario-item">
          <h3><strong>Nome : ${usuario.nome}</strong></h3>
          <p><strong>Email:</strong> ${usuario.email}</p>
          <p><strong>Grupo:</strong> ${usuario.grupo}</p>
          <p><strong>RA:</strong> ${usuario.ra}</p>
          <p><strong>Desmarcações:</strong> ${usuario.desmarcacoes}</p>
          <button class="usuario-botao usuario-botao-editar" onclick="editarUsuario(${
            usuario.id
          })">Editar</button>
          ${
            isAdmin
              ? `
            <button class="usuario-botao usuario-botao-deletar" onclick="deletarUsuario(${
              usuario.id
            })">Deletar</button>
            <button class="usuario-botao usuario-botao-alterar" onclick="alterarGrupo(${
              usuario.id
            }, '${usuario.grupo}')">
              ${
                usuario.grupo === "administrador"
                  ? "Remover Admin"
                  : "Tornar Admin"
              }
            </button>
          `
              : ""
          }
        </div>
      `;
  return usuarioItem;
}

async function editarUsuario(id) {
  // Redirecionar para o formulário de edição passando o id do usuário
  window.location.href = `editarUsuario.html?id=${id}`;
}

async function deletarUsuario(id) {
  const confirmation = confirm("Tem certeza que deseja deletar este usuário?");
  if (confirmation) {
    const { error } = await client.from("usuarios").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar usuário:", error);
      alert("Erro ao deletar usuário.");
    } else {
      alert("Usuário deletado com sucesso!");
      loadUsuarios(); // Atualiza a lista de usuários
    }
  }
}

async function alterarGrupo(id, grupoAtual) {
  // Determina o novo grupo com base no grupo atual
  const novoGrupo = grupoAtual === "professor" ? "administrador" : "professor";

  const { error } = await client
    .from("usuarios")
    .update({ grupo: novoGrupo })
    .eq("id", id);

  if (error) {
    console.error("Erro ao alterar grupo do usuário:", error);
    alert("Erro ao alterar grupo do usuário.");
  } else {
    alert(
      `Usuário agora é ${
        novoGrupo === "administrador" ? "administrador" : "professor"
      }!`
    );
    loadUsuarios(); // Atualiza a lista de usuários
  }
}

// Inicializar a listagem
loadUsuarios();
