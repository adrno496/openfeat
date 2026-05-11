/* Direct ZIP download on "Acheter 49 €" click */

const ZIP_URL = 'dist/formations-claude-code.zip'
const ZIP_FILENAME = 'formations-claude-code.zip'

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-buy-button]').forEach((btn) => {
    btn.setAttribute('href', ZIP_URL)
    btn.setAttribute('download', ZIP_FILENAME)
    btn.addEventListener('click', revealDownloadZone)
  })

  const dl = document.querySelector('[data-download]')
  if (dl) {
    dl.setAttribute('href', ZIP_URL)
    dl.setAttribute('download', ZIP_FILENAME)
  }
})

function revealDownloadZone() {
  const zone = document.getElementById('download-zone')
  if (zone) zone.classList.add('active')
}
