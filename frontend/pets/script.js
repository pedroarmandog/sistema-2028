const speciesData = [
    { name: "Aves", count: 4 },
    { name: "cachorro", count: 1 },
    { name: "cachorro", count: 1 },
    { name: "Cães", count: 1 },
    { name: "Canina", count: 121 },
    { name: "Felina", count: 23 },
    { name: "Reptil", count: 1 },
    { name: "Roedores", count: 1 }
];

function loadTable() {
    const tableBody = document.getElementById("speciesList");
    tableBody.innerHTML = "";

    speciesData.forEach(item => {
        const row = `
        <tr>
            <td>${item.name} <span class="badge">${item.count}</span></td>
            <td><span class="action-icon">✎</span></td>
            <td><span class="action-icon">🗑</span></td>
        </tr>
        `;
        tableBody.innerHTML += row;
    });
}

loadTable();
