const API_KEY = 'AIzaSyC7ZDrZ6KFm5CG1wIfoO5PfOzs3Brmpyb0'
const SHEET_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4'
const RANGE = 'Página1' // ou o nome da aba na sua planilha

const tabela = document.querySelector('#requisicoes-tabela tbody')
const cabecalho = document.querySelector('#tabela-cabecalho')
const busca = document.querySelector('#busca')
const form = document.querySelector('#requisicao-form')
const formContainer = document.querySelector('#form-container')
const abrirCadastro = document.querySelector('#abrir-cadastro')

abrirCadastro.onclick = () => {
  formContainer.style.display = 'block'
  form.scrollIntoView({ behavior: 'smooth' })
}

busca.addEventListener('input', e => {
  const termo = e.target.value.toLowerCase()
  for (let linha of tabela.rows) {
    const texto = linha.innerText.toLowerCase()
    linha.style.display = texto.includes(termo) ? '' : 'none'
  }
})

function montarCabecalho(colunas) {
  cabecalho.innerHTML = ''
  colunas.forEach(titulo => {
    const th = document.createElement('th')
    th.textContent = titulo
    th.style.cursor = 'pointer'
    th.onclick = () => ordenarTabela(titulo)
    cabecalho.appendChild(th)
  })
}

function ordenarTabela(coluna) {
  const index = [...cabecalho.children].findIndex(th => th.textContent === coluna)
  const linhas = [...tabela.rows]
  linhas.sort((a, b) => {
    const valA = a.cells[index].textContent
    const valB = b.cells[index].textContent
    return valA.localeCompare(valB, undefined, { numeric: true })
  })
  tabela.innerHTML = ''
  linhas.forEach(l => tabela.appendChild(l))
}

function preencherTabela(colunas, dados) {
  montarCabecalho(colunas)
  tabela.innerHTML = ''
  dados.forEach(linha => {
    const tr = document.createElement('tr')
    linha.forEach(cel => {
      const td = document.createElement('td')
      td.textContent = cel
      tr.appendChild(td)
    })
    tabela.appendChild(tr)
  })
}

function carregarDados() {
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`)
    .then(r => r.json())
    .then(data => {
      const [colunas, ...linhas] = data.values
      preencherTabela(colunas, linhas)
    })
    .catch(err => {
      alert('Erro ao carregar dados da planilha')
      console.error(err)
    })
}

form.addEventListener('submit', e => {
  e.preventDefault()

  const campos = form.querySelectorAll('input')
  const novaLinha = Array.from(campos).map(campo => campo.value || '')

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({ values: [novaLinha] }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(() => {
      alert('Requisição gravada com sucesso!')
      form.reset()
      formContainer.style.display = 'none'
      carregarDados()
    })
    .catch(err => {
      alert('Erro ao gravar na planilha')
      console.error(err)
    })
})

carregarDados()
