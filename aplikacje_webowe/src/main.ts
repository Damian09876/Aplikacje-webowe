import { addProject, getProjects, deleteProject } from "./controller"
import { ProjectService } from "./service" // Importujemy, by móc użyć update
 
const service = new ProjectService()
const nameInput = document.getElementById("name") as HTMLInputElement
const descInput = document.getElementById("description") as HTMLInputElement
const addBtn = document.getElementById("addBtn") as HTMLButtonElement
const list = document.getElementById("projects") as HTMLUListElement
 
let editingProjectId: string | null = null // Śledzimy, czy edytujemy
 
function render() {
  list.innerHTML = ""
  const projects = getProjects()
 
  projects.forEach(project => {
    const li = document.createElement("li")
    li.innerHTML = `
      <strong>${project.name}</strong>: ${project.description}
      <button class="edit-btn">Edytuj</button>
      <button class="delete-btn">Usuń</button>
    `
 
    // Przycisk Edytuj
    li.querySelector(".edit-btn")?.addEventListener("click", () => {
      nameInput.value = project.name
      descInput.value = project.description
      editingProjectId = project.id // Ustawiamy ID edycji
      addBtn.innerText = "Zapisz zmiany" // Zmieniamy tekst przycisku
    })
 
    // Przycisk Usuń
    li.querySelector(".delete-btn")?.addEventListener("click", () => {
      deleteProject(project.id)
      render()
    })
 
    list.appendChild(li)
  })
}
 
addBtn.addEventListener("click", () => {
  if (editingProjectId) {
    // TRYB EDYCJI
    service.update({
      id: editingProjectId,
      name: nameInput.value,
      description: descInput.value
    })
    editingProjectId = null
    addBtn.innerText = "Dodaj projekt"
  } else {
    // TRYB DODAWANIA
    addProject(nameInput.value, descInput.value)
  }
 
  nameInput.value = ""
  descInput.value = ""
  render()
})
 
render()