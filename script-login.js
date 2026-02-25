document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;

    alert(`Welcome, ${username}!`);

    window.location.href = "./os.html"; 
});
