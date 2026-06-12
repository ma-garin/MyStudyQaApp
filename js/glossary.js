// js/glossary.js
import { setupCommonNavigation, setupBackToTopButtons } from './utils.js';
import { glossaryTerms } from './glossaryData.js';
import { CERTIFICATIONS, getSelectedCert, setSelectedCert } from './certifications.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonNavigation();
    setupBackToTopButtons();

    const list = document.getElementById('glossary-list');
    const search = document.getElementById('glossary-search-input');
    const certSelect = document.getElementById('glossary-cert-select');
    const count = document.getElementById('glossary-count');
    if (!list || !search || !certSelect) return;

    CERTIFICATIONS.filter(cert => cert.available).forEach(cert => {
        const option = document.createElement('option');
        option.value = cert.id;
        option.textContent = cert.fullName;
        certSelect.appendChild(option);
    });
    certSelect.value = getSelectedCert();

    function selectedTerms() {
        return glossaryTerms.filter(term => !term.certIds || term.certIds.includes(certSelect.value));
    }

    function render(terms) {
        list.querySelectorAll('.glossary-term-item').forEach(item => item.remove());
        const noResults = list.querySelector('.no-results');
        noResults?.classList.toggle('hidden', terms.length > 0);
        if (count) count.textContent = `${terms.length}語を表示`;
        terms.forEach(term => {
            const card = document.createElement('article');
            card.className = 'glossary-term-item';
            const heading = document.createElement('h3');
            heading.textContent = term.term;
            const description = document.createElement('p');
            description.textContent = term.definition;
            card.append(heading, description);
            list.appendChild(card);
        });
    }

    search.addEventListener('input', () => {
        const query = search.value.trim().toLocaleLowerCase('ja');
        render(selectedTerms().filter(item =>
            item.term.toLocaleLowerCase('ja').includes(query)
            || item.definition.toLocaleLowerCase('ja').includes(query)
        ));
    });
    certSelect.addEventListener('change', () => {
        setSelectedCert(certSelect.value);
        search.dispatchEvent(new Event('input'));
    });
    render(selectedTerms());
});
