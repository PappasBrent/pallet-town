function closeIconEvent(e) {
    const msgBox = e.target.parentNode.parentNode;
    msgBox.style.display = "none"
}
const closeIcon = icon => msgBox = icon.parentNode.parentNode.style.display = "none"

function closeAllIcons() {
    const closeIcons = document.querySelectorAll(".icon-close");
    closeIcons.forEach(icon => closeIcon(icon));
}





window.onload = () => {
    const searchCardGrid = document.querySelector('.card-search-grid')
    const userCardGrid = document.querySelector('.deck-grid')
    const userCardCounts = {}

    async function searchCards() {
        const maxResultsPerPage = 1
        // const formInputIds = ["name", "set", "supertype", "types"]
        // TODO: Add types searching functionality back in
        const formInputIds = ["name", "set", "supertype"]
        const formValues = {}
        formInputIds.forEach(id => formValues[id] = document.getElementById(id).value)
        const apiURL = "https://api.pokemontcg.io/v1/cards?"
        let queryString = Object.keys(formValues).reduce((qs, key) => qs + `&${key}=${formValues[key]}`, "")
        if (formValues["supertype"] != "pokemon")
            queryString = queryString.replace(/(&supertype=.*)&/gi, "", (match) => console.log(match))
        queryString += `&pageSize=${maxResultsPerPage}`
        const results = await fetch(apiURL + queryString).then(res => res.json())
        displayCards(results.cards)
    }

    function displayCards(cards) {
        console.log(cards);
        while (searchCardGrid.firstChild) searchCardGrid.removeChild(searchCardGrid.firstChild)
        cards.forEach(card => {
            const cardImg = document.createElement("img")
            cardImg.src = card.imageUrl
            if (!Object.keys(userCardCounts).includes(cardImg.src))
                userCardCounts[cardImg.src] = 1
            cardImg.onclick = function () {
                for (let i = 0; i < userCardGrid.children.length; i++) {
                    const existingCardImg = userCardGrid.children.item(i).firstChild;
                    if (existingCardImg.src === cardImg.src) {
                        userCardCounts[cardImg.src] += 1
                        console.log(existingCardImg.parentElement);
                        existingCardImg.parentElement.children.item(1).innerText = userCardCounts[cardImg.src]
                        return
                    }
                }
                const cardToAddContainer = document.createElement("div")
                const cardToAdd = cardImg.cloneNode()
                cardToAdd.onclick = function () {
                    userCardCounts[cardToAdd.src] = userCardCounts[cardToAdd.src] - 1
                    this.parentElement.children.item(1).innerText = userCardCounts[cardImg.src]
                    if (userCardCounts[cardToAdd.src] <= 0) userCardGrid.removeChild(this.parentElement)
                }
                userCardCounts[cardToAdd.src] = 1
                cardToAdd.className = 'card'

                const cardCountText = document.createElement("div")
                cardCountText.innerText = userCardCounts[cardToAdd.src]
                cardCountText.className = 'card-count'

                cardToAddContainer.className = 'card-container'

                cardToAddContainer.appendChild(cardToAdd)
                cardToAddContainer.appendChild(cardCountText)
                userCardGrid.appendChild(cardToAddContainer)
            }
            searchCardGrid.appendChild(cardImg)
        })
    }

    while (searchCardGrid.firstChild) searchCardGrid.removeChild(searchCardGrid.firstChild)
    const closeIcons = document.querySelectorAll(".icon-close")
    closeIcons.forEach(icon => icon.addEventListener("click", closeIconEvent));
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27) closeAllIcons()
    })
    if (document.querySelector(".card-search")) {
        document.querySelector(".card-name-field > input").addEventListener("keyup", searchCards)
        document.querySelector(".expansion-name-field > input").addEventListener("keyup", searchCards)
        document.querySelector(".card-type-field > select").addEventListener("click", searchCards)
        // document.querySelector(".pokemon-type-field > select").addEventListener("click", searchCards)
    }
}