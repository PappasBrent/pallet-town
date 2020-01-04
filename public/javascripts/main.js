function styleActiveTab() {
    const tabs = document.querySelectorAll("header .nav-ul li a")
    tabs.forEach(tab => {
        if (window.location.pathname === tab.getAttribute('href'))
            tab.classList.add("active-tab")
    })
}

function closeIcon(icon) {
    icon.parentNode.parentNode.style.display = "none"
}

function closeIconEvent(e) {
    const msgBox = e.target.parentNode.parentNode;
    msgBox.style.display = "none"
}

function closeAllIcons() {
    const closeIcons = document.querySelectorAll(".icon-close");
    closeIcons.forEach(icon => closeIcon(icon));
}

function initMain() {
    styleActiveTab()
    const closeIcons = document.querySelectorAll(".icon-close")
    closeIcons.forEach(icon => icon.addEventListener("click", closeIconEvent));
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27) closeAllIcons()
    })
}

if (document.readyState !== 'loading') initMain()
else {
    const interval = setInterval(() => {
        if (document.readyState != 'loading') {
            initMain()
            clearInterval(interval)
        }
    }, 1000);
}