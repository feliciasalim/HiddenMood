export function renderHome() {
  return fetch('views/homeView.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('app').innerHTML = html;
    });
}
