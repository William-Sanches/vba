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

// Dados mock direto no JS
const dados = [
  {
    "Código": "001",
    "1doc solicitação": "DOC-123",
    "Solicitado por": "João",
    "Objeto da compra": "Material de escritório",
    "Valor": 250.00,
    "Fornecedor": 4581
  },
  {
    "Código": "002",
    "1doc solicitação": "DOC-124",
    "Solicitado por": "Maria",
    "Objeto da compra": "Cartucho de tinta",
    "Valor": 180.00,
    "Fornecedor": 3025
  }
]

const colunas = Object.keys(dados[0])
const linhas = dados.map(obj => colunas.map(col => obj[col] || ''))
preencherTabela(colunas, linhas)
