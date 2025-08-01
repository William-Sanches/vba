// Versão final conectada ao Google Sheets
const API_KEY = 'AIzaSyDNbQxexuY5hfYn4ED8_1xBTAdmApiKtz8'
const SHEET_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4'
const SHEET_NAME = 'Página1'
const SCRIPT_URL = 'https://script.google.com/macros/s/SEU_SCRIPT_URL/exec'

const tabela = document.querySelector('#requisicoes-tabela tbody')
const cabecalho = document.querySelector('#tabela-cabecalho')
const busca = document.querySelector('#busca')
const form = document.querySelector('#requisicao-form')
const formContainer = document.querySelector('#form-container')
const abrirCadastro = document.querySelector('#abrir-cadastro')
let dados = []
let colunas = []
let editandoIndex = null

abrirCadastro.onclick = () => {
  editandoIndex = null
  form.reset()
  formContainer.style.display = 'block'
  form.scrollIntoView({ behavior: 'smooth' })
}

form.onsubmit = e => {
  e.preventDefault()
  const novaLinha = {}
  for (let el of form.elements) {
    if (el.name) novaLinha[el.name] = el.value
  }
  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ data: novaLinha, index: editandoIndex }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.text())
    .then(() => location.reload())
    .catch(err => alert('Erro ao salvar'))
}

function montarCabecalho(colunas) {
  cabecalho.innerHTML = ''
  colunas.forEach(titulo => {
    const th = document.createElement('th')
    th.textContent = titulo
    th.onclick = () => ordenarTabela(titulo)
    cabecalho.appendChild(th)
  })
  const thAcoes = document.createElement('th')
  thAcoes.textContent = 'Ações'
  cabecalho.appendChild(thAcoes)
}

function preencherTabela(colunas, linhas) {
  montarCabecalho(colunas)
  tabela.innerHTML = ''
  linhas.forEach((linha, i) => {
    const tr = document.createElement('tr')
    tr.onclick = () => abrirModalDetalhes(linha)
    linha.forEach(cel => {
      const td = document.createElement('td')
      td.textContent = cel
      tr.appendChild(td)
    })
    const btn = document.createElement('button')
    btn.textContent = 'Editar'
    btn.onclick = e => {
      e.stopPropagation()
      formContainer.style.display = 'block'
      editandoIndex = i + 2
      colunas.forEach(c => {
        if (form[c]) form[c].value = linha[colunas.indexOf(c)] || ''
      })
      form.scrollIntoView({ behavior: 'smooth' })
    }
    const td = document.createElement('td')
    td.appendChild(btn)
    tr.appendChild(td)
    tabela.appendChild(tr)
  })
}

function abrirModalDetalhes(linha) {
  const texto = colunas.map((c, i) => `${c}: ${linha[i]}`).join('\n')
  alert(texto)
}

function ordenarTabela(coluna) {
  const index = colunas.indexOf(coluna)
  dados.sort((a, b) => {
    const valA = a[index]
    const valB = b[index]
    return valA.localeCompare(valB, undefined, { numeric: true })
  })
  preencherTabela(colunas, dados)
}

function carregarDados() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`
  fetch(url)
    .then(res => res.json())
    .then(json => {
      colunas = json.values[0]
      dados = json.values.slice(1)
      preencherTabela(colunas, dados)
    })
    .catch(err => alert('Erro ao carregar dados'))
}

carregarDados()
