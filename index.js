const client = ClientSubapase.getClient();
$("#menu").load("menu.html");
startApp();

async function startApp() {
  let u = await ClientSubapase.getUser();
  if (u == null) {
    window.location = "login.html";
  }
}

// Função para carregar as reservas em análise e aprovadas
async function loadReservas() {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    console.error("Erro na autenticação:", authError);
    return;
  }

  const userEmail = user.email.trim().toLowerCase();

  const { data: professorData, error: professorError } = await client
    .from("usuarios")
    .select("id")
    .eq("email", userEmail)
    .single();

  if (professorError) {
    console.error("Erro ao obter ID do professor:", professorError);
    return;
  }

  if (!professorData) {
    console.error("Nenhum professor encontrado com esse email.");
    return;
  }

  async function isAdmin(user) {
    const { data, error } = await client
      .from("usuarios")
      .select("grupo")
      .eq("email", user.email)
      .single();

    if (error) {
      console.error("Erro ao verificar se é administrador:", error);
      return false;
    }

    return data.grupo === "administrador";
  }

  const admin = await isAdmin(user);
  const professorId = professorData.id;
  let query;

  // Obter a data e hora atuais
  const now = new Date();
  // Obter a data de 24 horas atrás
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  if (admin) {
    query = client
      .from("reservas")
      .select(
        `
        id,
        datainicio,
        datafinal,
        laboratorio: laboratorios(nome),
        professor: usuarios(nome),
        status
      `
      )
      .gte("datafinal", yesterday) // Inclui reservas até 24 horas antes da data atual
      .order("datainicio", { ascending: true });
  } else {
    query = client
      .from("reservas")
      .select(
        `
        id,
        datainicio,
        datafinal,
        laboratorio: laboratorios(nome),
        professor,
        status
      `
      )
      .eq("professor", professorId)
      .gte("datafinal", yesterday) // Inclui reservas até 24 horas antes da data atual
      .order("datainicio", { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar reservas:", error);
    return;
  }

  // O restante do código continua igual
  const reservasEmAnaliseList = $("#reservas-em-analise-list");
  const reservasAprovadasList = $("#reservas-aprovadas-list");
  reservasEmAnaliseList.empty(); // Limpa a lista de reservas em análise antes de adicionar
  reservasAprovadasList.empty(); // Limpa a lista de reservas aprovadas antes de adicionar

  if (error) {
    reservasEmAnaliseList.append(
      `<tr><td colspan="5" class="no-reservas">Erro ao carregar reservas</td></tr>`
    );
    reservasAprovadasList.append(
      `<tr><td colspan="5" class="no-reservas">Erro ao carregar reservas</td></tr>`
    );
    return;
  }

  let hasReservasEmAnalise = false;
  let hasReservasAprovadas = false;

  // Filtra e adiciona as reservas nas respectivas listas
  data.forEach((reserva) => {
    const { id, datainicio, datafinal, laboratorio, professor, status } =
      reserva;
    const professorDisplay = admin ? reserva.professor.nome : professor;

    // Definir classe de status com base no status da reserva
    let statusClass = "";
    if (status === "Em Analise") {
      statusClass = "reserva-em-analise";
    } else if (status === "Rejeitada") {
      statusClass = "reserva-rejeitada";
    } else if (status === "Aprovada" && professor === professorId) {
      statusClass = "reserva-aprovada"; // Somente as aprovadas do usuário logado em verde
    }
    const datainicioformatada = new Date(datainicio).toLocaleString();
    const datafinalformatada = new Date(datafinal).toLocaleString();
    datainicionotficacao = new Date(reserva.datainicio);
    datainicionotficacao.setHours(datainicionotficacao.getHours() - 3);
    datafinalnotficacao = new Date(reserva.datafinal);
    datafinalnotficacao.setHours(datafinalnotficacao.getHours() - 3);
    const reservaRow = `
    <tr class="${statusClass}">
      <td>${laboratorio.nome}</td>
      <td>${datainicioformatada}</td>
      <td>${datafinalformatada}</td>
      <td>${professorDisplay}</td>
      <td>${status}</td>
      <td>
        ${
          admin && status === "Em Analise"
            ? `<button class="button" onclick="updateReserva(${
                reserva.id
              }, 'Aprovada', '${new Date(
                datainicionotficacao
              ).toISOString()}', '${new Date(
                datafinalnotficacao
              ).toISOString()}', '${
                reserva.laboratorio.nome
              }')">Aprovar</button>`
            : ""
        }
        ${
          admin && status === "Aprovada"
            ? `<button class="button" onclick="updateReserva(${
                reserva.id
              }, 'Em Analise', '${new Date(
                reserva.datainicio
              ).toISOString()}', '${new Date(
                reserva.datafinal
              ).toISOString()}', '${
                reserva.laboratorio.nome
              }')">Reverter</button>`
            : ""
        }
        <button class="button-red" onclick="handleDeleteOrReject(${
          reserva.id
        }, '${status}', ${admin}, ${professorId === reserva.professor})">
          X
        </button>
      </td>
    </tr>
    `;

    if (status === "Em Analise" || status === "Rejeitada") {
      reservasEmAnaliseList.append(reservaRow);
      hasReservasEmAnalise = true;
    }
    if (status === "Aprovada") {
      reservasAprovadasList.append(reservaRow);
      hasReservasAprovadas = true;
    }
  });

  // Se não houver reservas em análise
  if (!hasReservasEmAnalise) {
    reservasEmAnaliseList.append(
      `<tr><td colspan="5" class="no-reservas">Nenhuma reserva em análise</td></tr>`
    );
  }

  // Se não houver reservas aprovadas
  if (!hasReservasAprovadas) {
    reservasAprovadasList.append(
      `<tr><td colspan="5" class="no-reservas">Nenhuma reserva aprovada</td></tr>`
    );
  }
}

async function updateReserva(
  id,
  novoStatus,
  datainicio,
  datafinal,
  laboratorio
) {
  const { data: reservaData, error: reservaError } = await client
    .from("reservas")
    .select("professor")
    .eq("id", id)
    .single(); // Obtem o professor da reserva

  if (reservaError) {
    console.error("Erro ao obter reserva:", reservaError);
    return;
  }

  // Atualiza o status da reserva
  const { error } = await client
    .from("reservas")
    .update({ status: novoStatus })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar reserva:", error);
  } else {
    // Adiciona notificação ao usuário
    const notificacao =
      novoStatus === "Aprovada"
        ? `Reserva aprovada: ${laboratorio} ${datainicio} ${datafinal}`
        : novoStatus === "Rejeitada"
        ? `Reserva rejeitada: ${laboratorio} ${datainicio} ${datafinal}`
        : `Reserva desaprovada: ${laboratorio} ${datainicio} ${datafinal}`;

    await adicionarNotificacao(reservaData.professor, notificacao);

    loadReservas(); // Recarrega as reservas após a atualização
  }
}

// Função para adicionar uma notificação ao usuário
async function adicionarNotificacao(usuarioId, mensagem) {
  // Recupera as notificações existentes do usuário
  const { data: usuarioData, error: usuarioError } = await client
    .from("usuarios")
    .select("notificacao")
    .eq("id", usuarioId)
    .single();

  if (usuarioError) {
    console.error("Erro ao obter notificações do usuário:", usuarioError);
    return;
  }

  // Adiciona a nova mensagem ao array de notificações
  const notificacoesAtuais = usuarioData.notificacao || []; // Garante que seja um array, mesmo que esteja vazio
  notificacoesAtuais.push(mensagem); // Adiciona a nova notificação

  // Atualiza as notificações no banco de dados
  const { error } = await client
    .from("usuarios")
    .update({ notificacao: notificacoesAtuais }) // Atualiza com o array completo
    .eq("id", usuarioId);

  if (error) {
    console.error("Erro ao adicionar notificação:", error);
  }
}

async function handleDeleteOrReject(id, status, isAdmin, isOwner) {
  // Obtém os dados da reserva antes de executar a lógica
  const { data: reservaData, error: reservaError } = await client
    .from("reservas")
    .select("professor")
    .eq("id", id)
    .single(); // Obtém o professor da reserva

  if (reservaError) {
    console.error("Erro ao obter reserva:", reservaError);
    return;
  }

  if (status === "Aprovada" || status === "Em Analise") {
    if (confirm("Você tem certeza que deseja rejeitar essa reserva?")) {
      const { error } = await client
        .from("reservas")
        .update({ status: "Rejeitada" })
        .eq("id", id);

      if (error) {
        console.error("Erro ao rejeitar reserva:", error);
      } else {
        const notificacao = "Reserva rejeitada";
        await adicionarNotificacao(reservaData.professor, notificacao);

        loadReservas(); // Recarrega as reservas após a rejeição
      }
    }
  } else if (isOwner) {
    if (confirm("Você tem certeza que deseja excluir essa reserva?")) {
      // Verifica se a reserva não é "Rejeitada"
      if (status !== "Rejeitada") {
        // Incrementa a variável desmarcacoes do usuário logado
        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();

        if (authError) {
          console.error("Erro na autenticação:", authError);
          return;
        }

        const userEmail = user.email.trim().toLowerCase();

        // Busca o número atual de desmarcações do usuário
        const { data: userData, error: userError } = await client
          .from("usuarios")
          .select("desmarcacoes")
          .eq("email", userEmail)
          .single(); // Um único registro já que o email é único

        if (userError || !userData) {
          console.error(
            "Erro ao obter dados do usuário:",
            userError || "Usuário não encontrado"
          );
          return;
        }

        const currentDesmarcacoes = userData.desmarcacoes || 0; // Se for null ou undefined, começa com 0

        // Incrementa o número de desmarcações
        const { error: updateError } = await client
          .from("usuarios")
          .update({ desmarcacoes: currentDesmarcacoes + 1 })
          .eq("email", userEmail);

        if (updateError) {
          console.error("Erro ao atualizar desmarcações:", updateError);
          return;
        }
      }

      // Realiza a exclusão da reserva no Supabase
      const { error: deleteError } = await client
        .from("reservas")
        .delete()
        .eq("id", reservaId);

      if (deleteError) {
        console.error("Erro ao deletar a reserva:", deleteError);
        return;
      }

      // Atualiza a interface (remova a reserva da lista ou recarregue a página)
      console.log("Reserva deletada com sucesso.");
      loadReservas(); // Recarrega as reservas para refletir a mudança
    }
  }
}
function toggleForm() {
  const form = document.getElementById("reserva-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
}
async function loadLaboratorios() {
  const { data: laboratorios, error } = await client
    .from("laboratorios")
    .select("id, nome");

  if (error) {
    console.error("Erro ao carregar laboratórios:", error);
    return;
  }
  const laboratorioSelectF = document.getElementById("laboratorioFiltro");

  laboratorios.forEach((laboratorio) => {
    const option = document.createElement("option");
    option.value = laboratorio.id;
    option.textContent = laboratorio.nome;
    laboratorioSelectF.appendChild(option);
  });

  const laboratorioSelect = document.getElementById("laboratorio");
  laboratorios.forEach((lab) => {
    const option = document.createElement("option");
    option.value = lab.id;
    option.textContent = lab.nome;
    laboratorioSelect.appendChild(option);
  });
}

document
  .getElementById("reserva-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    let datainicio = new Date(document.getElementById("datainicio").value);
    let datafinal = new Date(document.getElementById("datafinal").value);

    // Se já estiver tratando o fuso horário corretamente, remova a adição manual de 3 horas
    // datainicio.setHours(datainicio.getHours() + 3);
    // datafinal.setHours(datafinal.getHours() + 3);

    if (datainicio < new Date()) {
      alert("A data inicial não pode ser menor que a data atual.");
      return;
    }

    if (datafinal <= datainicio) {
      alert("A data final deve ser maior que a data inicial.");
      return;
    }

    let diffMs = datafinal - datainicio;
    let diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 1.5) {
      alert("A reserva deve ter uma duração máxima de 1 hora e meia.");
      return;
    }

    const dataInicio = document.getElementById("datainicio").value;
    const dataFinal = document.getElementById("datafinal").value;
    const laboratorioId = document.getElementById("laboratorio").value;

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError) {
      console.error("Erro na autenticação:", authError);
      return;
    }

    const userEmail = user.email.trim().toLowerCase();

    const { data: professorData, error: professorError } = await client
      .from("usuarios")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (professorError || !professorData) {
      console.error("Erro ao obter ID do professor:", professorError);
      return;
    }

    const professorId = professorData.id;

    // Verifica se já existe uma reserva no mesmo laboratório e com conflito de datas
    const { data: existingReservations, error: reservationError } = await client
      .from("reservas")
      .select("datainicio, datafinal")
      .eq("laboratorio", laboratorioId)
      .or(`and(datainicio.lte.${dataFinal},datafinal.gte.${dataInicio})`);

    if (reservationError) {
      console.error("Erro ao verificar reservas existentes:", reservationError);
      return;
    }

    if (existingReservations.length > 0) {
      alert(
        "Já existe uma reserva no mesmo laboratório nesse intervalo de datas."
      );
      return;
    }

    // Se não houver conflitos de data e laboratório, insere a reserva
    const { error: insertError } = await client.from("reservas").insert({
      datainicio: dataInicio,
      datafinal: dataFinal,
      laboratorio: laboratorioId,
      professor: professorId,
      status: "Em Analise",
    });

    if (insertError) {
      console.error("Erro ao adicionar reserva:", insertError);
    } else {
      alert("Reserva adicionada com sucesso!");
      loadReservas();
      toggleForm();
    }
  });

//TESTE
async function buscarReservas() {
  const { data, error } = await client
    .from("reservas")
    .select("datafinal, datainicio, laboratorio (nome)")
    .eq("status", "Aprovada");

  if (error) {
    console.error("Erro ao buscar reservas:", error);
    return [];
  }

  const agora = new Date();

  // Filtrar as reservas cuja data final tenha passado mais de 24 horas da data atual
  return data
    .filter((reserva) => {
      const dataFinal = new Date(reserva.datafinal);
      const diffEmHoras = (agora - dataFinal) / (1000 * 60 * 60);
      return diffEmHoras <= 24;
    })
    .map((reserva) => {
      return {
        data: reserva.datafinal.split("T")[0],
        horario: `${new Date(reserva.datainicio).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${new Date(reserva.datafinal).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        laboratorio: reserva.laboratorio.nome,
      };
    });
}

// Função para exibir reservas
async function exibirReservas() {
  const reservasDoDia = await buscarReservas();

  const reservasPorDia = {};

  reservasDoDia.forEach((reserva) => {
    const data = reserva.data;
    if (!reservasPorDia[data]) {
      reservasPorDia[data] = [];
    }
    reservasPorDia[data].push(reserva);
  });

  for (const data in reservasPorDia) {
    const reservas = reservasPorDia[data];

    const diaDiv = document.querySelector(
      `#calendario .dia[data-data="${data}"]`
    );

    if (diaDiv) {
      // Limpa as reservas existentes
      diaDiv.innerHTML = "";

      reservas.forEach((reserva) => {
        const reservaDiv = document.createElement("div");
        reservaDiv.className = "reserva";
        reservaDiv.textContent = `${reserva.horario} - ${reserva.laboratorio}`;
        diaDiv.appendChild(reservaDiv);
      });

      // Ajusta a altura do diaDiv com base no número de reservas
      const reservaHeight = 40; // Altura média de cada reserva
      const totalHeight = reservas.length * reservaHeight; // Total de altura das reservas
      diaDiv.style.height = `${Math.max(totalHeight + 20, 100)}px`; // Define a nova altura, garantindo pelo menos 100px
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Remova ou ajuste a chamada se não for necessária
  const reservas = await loadReservas();
  if (reservas) {
    exibirReservas(reservas);
  }
});

async function criarCalendario(mes, ano) {
  const reservas = await buscarReservas();
  const primeiroDia = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  // Obter data atual para destacar o dia
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Criar cabeçalho com os dias da semana
  const calendarioDiv = document.getElementById("calendario");
  calendarioDiv.innerHTML = ""; // Limpar conteúdo anterior

  diasDaSemana.forEach((dia) => {
    const diaHeader = document.createElement("div");
    diaHeader.textContent = dia;
    diaHeader.className = "dia";
    calendarioDiv.appendChild(diaHeader);
  });

  // Calcular o dia da semana em que o primeiro dia do mês cai
  const primeiroDiaDaSemana = primeiroDia.getDay();

  // Preencher dias do mês anterior para manter a estrutura do calendário
  const diasDoMesAnterior = primeiroDia.getDate() - primeiroDiaDaSemana;
  for (let i = diasDoMesAnterior; i < 0; i++) {
    const diaDiv = document.createElement("div");
    diaDiv.className = "dia";
    const dia = new Date(ano, mes - 1, i + 1);
    diaDiv.innerHTML = `<h4>${dia.getDate()}</h4>`;

    const dataAtual = `${ano}-${String(mes).padStart(2, "0")}-${String(
      dia.getDate()
    ).padStart(2, "0")}`;

    // Verificar e exibir as reservas
    const reservasDoDia = reservas.filter(
      (reserva) => reserva.data === dataAtual
    );
    reservasDoDia.forEach((reserva) => {
      const reservaDiv = document.createElement("div");
      reservaDiv.className = "reserva";
      reservaDiv.textContent = `${reserva.horario} - ${reserva.laboratorio}`;
      diaDiv.appendChild(reservaDiv);
    });

    calendarioDiv.appendChild(diaDiv);
  }

  // Preencher os dias do mês atual
  for (let i = 1; i <= diasNoMes; i++) {
    const diaDiv = document.createElement("div");
    diaDiv.className = "dia";

    // Destacar o dia atual com uma cor laranja
    if (i === diaAtual && mes === mesAtual && ano === anoAtual) {
      diaDiv.classList.add("dia-atual");
    }

    diaDiv.innerHTML = `<h4>${i}</h4>`;

    const dataAtual = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
      i
    ).padStart(2, "0")}`;

    // Verificar e exibir as reservas
    const reservasDoDia = reservas.filter(
      (reserva) => reserva.data === dataAtual
    );
    reservasDoDia.forEach((reserva) => {
      const reservaDiv = document.createElement("div");
      reservaDiv.className = "reserva";
      reservaDiv.textContent = `${reserva.horario} - ${reserva.laboratorio}`;
      diaDiv.appendChild(reservaDiv);
    });

    calendarioDiv.appendChild(diaDiv);
  }

  // Preencher dias do próximo mês
  const diasRestantes = 42 - (diasNoMes + primeiroDiaDaSemana);
  for (let i = 1; i <= diasRestantes; i++) {
    const diaDiv = document.createElement("div");
    diaDiv.className = "dia";
    diaDiv.innerHTML = `<h4>${i}</h4>`;

    const dataAtual = `${ano}-${String(mes + 2).padStart(2, "0")}-${String(
      i
    ).padStart(2, "0")}`;

    // Verificar e exibir as reservas
    const reservasDoDia = reservas.filter(
      (reserva) => reserva.data === dataAtual
    );
    reservasDoDia.forEach((reserva) => {
      const reservaDiv = document.createElement("div");
      reservaDiv.className = "reserva";
      reservaDiv.textContent = `${reserva.horario} - ${reserva.laboratorio}`;
      diaDiv.appendChild(reservaDiv);
    });

    calendarioDiv.appendChild(diaDiv);
  }
}

async function filtrarReservas() {
  const dataInput = document.getElementById("dataFiltro").value;
  const laboratorioInput = document.getElementById("laboratorioFiltro").value;

  let query = client.from("reservas").select(`
    id,
    datainicio,
    datafinal,
    laboratorio: laboratorios(nome),
    professor,
    status
  `);
  query = query.eq("status", "Aprovada");

  if (laboratorioInput) {
    query = query.eq("laboratorio", laboratorioInput);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao filtrar reservas:", error);
    return;
  }

  exibirReservas(data, dataInput);
}

function exibirReservas(reservas, dataInput) {
  const reservaLista = document.querySelector(".reservas-filtradas");

  if (!reservaLista) {
    console.error("Elemento de lista de reservas não encontrado.");
    return;
  }

  reservaLista.innerHTML = ""; // Limpar resultados anteriores

  // Exibe ou oculta a div com base na existência de reservas
  reservaLista.style.display = reservas.length ? "block" : "none";

  // Criação da estrutura da tabela com cabeçalho
  let tableHTML = `
    <h2 class="titulo-reservas-filtradas">Reservas Filtradas</h2>
    <table class="tabela-reservas">
      <thead>
        <tr>
          <th>Data Início</th>
          <th>Data Fim</th>
          <th>Laboratório</th>
          <th>Professor</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Filtro de data, se houver
  let dataFiltro = null;
  if (dataInput) {
    dataFiltro = new Date(dataInput);
    dataFiltro.setHours(dataFiltro.getHours() + 3); // Adiciona 3 horas
    dataFiltro = dataFiltro.toLocaleDateString();
  }

  reservas.forEach((reserva) => {
    const dataInicio = new Date(reserva.datainicio).toLocaleDateString();
    const dataFinal = new Date(reserva.datafinal).toLocaleDateString();
    const datainicioformatada = new Date(reserva.datainicio).toLocaleString();
    const datafinalformatada = new Date(reserva.datafinal).toLocaleString();
    if (!dataFiltro || dataFiltro === dataInicio || dataFiltro === dataFinal) {
      tableHTML += `
        <tr>
          <td>${datainicioformatada}</td>
          <td>${datafinalformatada}</td>
          <td>${reserva.laboratorio.nome}</td>
          <td>${reserva.professor}</td>
        </tr>`;
    }
  });

  tableHTML += `
      </tbody>
    </table>`;

  // Insere a tabela dentro da div reservaLista
  reservaLista.innerHTML = tableHTML;
}

// Definir mês e ano atual
const dataAtual = new Date();
const mesAtual = dataAtual.getMonth();
const anoAtual = dataAtual.getFullYear();
criarCalendario(mesAtual, anoAtual);

loadLaboratorios();

// Chama a função para carregar as reservas ao iniciar
loadReservas();
