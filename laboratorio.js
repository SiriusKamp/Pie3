var client = ClientSubapase.getClient();
$("#menu").load("menu.html");

let isAdmin = false;

// Função para verificar se o usuário é administrador
async function verificarAdmin() {
  let u = await ClientSubapase.getUser();
  if (u) {
    const email = u.email;

    const { data, error } = await client
      .from("usuarios")
      .select("grupo")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Erro ao buscar o grupo do usuário:", error);
      return false;
    } else if (data && data.grupo === "administrador") {
      // Se o grupo for administrador, mostrar o botão
      $("#add-laboratorio").show();
      isAdmin = true; // Define isAdmin como true
    }
  }
}

// Função para abrir o card de inserção de laboratório
$("#add-laboratorio").click(function () {
  $("#laboratorio-card").toggle(); // Exibe ou oculta o card
});

// Função para inserir um novo laboratório no banco
async function inserirLaboratorio() {
  const nome = $("#laboratorio-nome").val();

  if (nome) {
    const { data, error } = await client
      .from("laboratorios")
      .insert([{ nome: nome }]);

    if (error) {
      console.error("Erro ao inserir laboratório:", error);
      alert("Erro ao inserir laboratório.");
    } else {
      alert("Laboratório inserido com sucesso!");
      loadLaboratorios(); // Atualiza a lista de laboratórios
      $("#laboratorio-card").hide(); // Esconde o card após a inserção
    }
  } else {
    alert("Por favor, insira o nome do laboratório.");
  }
}

// Função para excluir um laboratório
async function excluirLaboratorio(id) {
  const { error } = await client.from("laboratorios").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir laboratório:", error);
    alert("Erro ao excluir laboratório.");
  } else {
    alert("Laboratório excluído com sucesso!");
    loadLaboratorios(); // Atualiza a lista de laboratórios
  }
}

// Função para buscar laboratórios
async function loadLaboratorios() {
  const { data, error } = await client.from("laboratorios").select("id, nome");

  if (error) {
    console.error("Erro ao buscar laboratórios:", error);
    alert("Erro ao carregar laboratórios.");
  } else {
    // Exibe os laboratórios
    displayLaboratorios(data);
  }
}

// Função para exibir laboratórios na página
function displayLaboratorios(laboratorios) {
  const listContainer = $("#laboratorio-list");
  listContainer.empty(); // Limpa o conteúdo atual

  if (laboratorios.length === 0) {
    listContainer.append("<p>Nenhum laboratório encontrado.</p>");
  } else {
    laboratorios.forEach((laboratorio) => {
      let laboratorioItem = `
        <div class="laboratorio-item">
            <h3>${laboratorio.nome}</h3>
            <p>ID: ${laboratorio.id}</p>
      `;

      // Se o usuário for administrador, adiciona o botão de excluir
      if (isAdmin) {
        laboratorioItem += `
          <button class="delete-btn" onclick="excluirLaboratorio(${laboratorio.id})">
            Excluir
          </button>
        `;
      }

      laboratorioItem += `</div>`;
      listContainer.append(laboratorioItem);
    });
  }
}

// Inicializa a verificação de administrador e a lista de laboratórios
async function init() {
  await verificarAdmin(); // Verifica se o usuário é admin
  loadLaboratorios(); // Carrega a lista de laboratórios
}

init(); // Chama a função de inicialização
