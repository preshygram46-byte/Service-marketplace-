function ShowPage(Page){
  document.getElementById("LandingPage").style.display = "none"
  document.getElementById("ServicePage").style.display = "none"
  document.getElementById("CostumerPage").style.display = "none"
  document.getElementById("ProviderPage").style.display = "none"
  document.getElementById("BookPage").style.display = "none"
  document.getElementById("MyServicePage").style.display = "none"
  document.getElementById(Page).style.display = "block"
 // document.getElementById("H_btn").style.backgroundColor="red"
}

function head_select(button){
  const btns = document.querySelectorAll(".header_but")
  for(let btn of btns){
    btn.style.backgroundColor ="#161641c7"
  }
  button.style.backgroundColor ="#f05a0ec7"
}

let services_rendered = 0

function add_serve(){
  const input = document.getElementById("serve_input").value
  const chat = document.getElementById("serve_list");
  let block = document.createElement("button");
  block.className = "serv_but";
  if (input !== ""){
    block.textContent = input
    chat.appendChild(block)
  }else{
    alert("put down the name of your service")
  }
}

function addbook(button){
  const list = document.getElementById("Book_list");
  let book = document.createElement("div")
  const B_btns = document.querySelectorAll(".Book_notify");
  book.className = "Book_notify"
  book.textContent =  button.textContent
  
  list.appendChild(book)
}
