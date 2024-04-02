let sympthoms_data;
let disease_data;
let obj={};
let tooltips = {};
fetch('./evidences.json')
    .then((response) => response.json())
    .then((json) => {
        sympthoms_data = json;
        display_symptoms();
});

fetch('./diseases.json')
    .then((response) => response.json())
    .then((json) => {
        disease_data = json;
});

let display_symptoms = ()=>{
    let select_field = document.querySelector("#sympthom");
    for(let [i,value] of Object.entries(sympthoms_data)){
        let sympthoms_index = parseInt(value["index"]);
        let sympthoms_name = value["short"];
        let option = document.createElement("option");
        option.setAttribute("value", sympthoms_index);
        option.setAttribute("data-popup-target","#popup");

        if (value.hasOwnProperty("tooltip")){
            tooltips[sympthoms_index] = value["tooltip"];
        }

        option.innerText = sympthoms_name;
        select_field.appendChild(option);
        obj[sympthoms_index]=sympthoms_name;
    }
    new MultiSelectTag('sympthom');
    attachSymptomClickHandler();
    attachSubmitHandler();

}

function argMax(array) {
    return [].map.call(array, (x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

let entropy = (arr) => {
    let res = 0;
    for (let i =0;i<arr.length;i++){
        res += arr[i] * Math.log(arr[i]);
    }
    return - res / arr.length;
}

let percent_entropy = (arr) => {
    let max_entropy = Math.log(arr.length);
    let ent = entropy(arr);
    return (1 - ent / max_entropy) * 100;
}

async function attachSubmitHandler(){
    
    const session = await ort.InferenceSession.create('./model.onnx');
    document.querySelector("form").addEventListener("submit", (e)=>{
        e.preventDefault();
        
        if (arr.length < 3){
            alert("Doctor House needs at least 3 symptoms to diagnose you!");
            return;
        }

        let sympthom_count = Object.keys(sympthoms_data).length;
        let sympthoms = new Array(sympthom_count).fill(0);
        
        for(let i = 0;i<arr.length;i++){
            sympthoms[arr[i]] = 1;
        }

        for (const [key, value] of Object.entries(categorical_dict)) {
            sympthoms[key] = value;
        }
        
        const feeds = { input: new ort.Tensor('float32', sympthoms, [1, sympthom_count]) };
        session.run(feeds).then((results)=>{
            let output = results.output.cpuData;
            let disease_index = argMax(output);
            let disease = disease_data[disease_index.toString()];
            let disease_name = disease.name;
            let disease_description = disease.description;
            let disease_recommendations = disease.recommendations;
            
            window.output = output;

            //document.querySelector(".certainty").innerText = parseInt(percent_entropy(output));
            document.querySelector(".disease-name").innerText = disease_name;
            document.querySelector(".disease-description-text").innerText = disease_description;

            let recommendations_parent = document.querySelector(".recommendations-content");
            recommendations_parent.innerHTML = "";
            for(let i = 0;i<disease_recommendations.length;i++){
                let span = document.createElement("span");
                span.innerText = disease_recommendations[i];
                recommendations_parent.appendChild(span);
            }

            document.querySelector(".disease-card").style.display = "initial";

        });

    })
}


let arr=[];
let categorical_dict = {};
let add_listener = ()=>{
    let options = document.querySelectorAll(".mult-select-tag li")
    let handler = (ev)=>{
    let id = parseInt(ev.target.getAttribute("data-value"));
    if(arr.length>=10) {
        alert("Too many sympthoms! Foreman is waiting for you in his office.");
        window.location.reload();
        return;
    }
    arr.push(id);
    console.log(arr);
    let labelList = Array.from(document.querySelectorAll("#whiteboard>label"));
    if (tooltips.hasOwnProperty(arr[arr.length-1])){
        
        let tooltip = document.createElement("span");
        tooltip.classList.add("sympthom-tooltip");
        tooltip.setAttribute("data-title", tooltips[arr[arr.length-1]]);
        tooltip.innerHTML = "&#9432;";
        
        
        //+ "<span class='sympthom-tooltip' data-title='" + tooltips[arr[arr.length-1]] + "'></span>";
        labelList[arr.length-1].insertBefore(tooltip, document.querySelectorAll(".close-button")[arr.length - 1]);

        labelList[arr.length-1].children[0].innerHTML=obj[arr[arr.length-1]];
        button = labelList[arr.length-1].children[2];
        button.style.display="inline-table";
    } else {
        labelList[arr.length-1].children[0].innerText=obj[arr[arr.length-1]];
        button = labelList[arr.length-1].children[1];
        button.style.display="inline-table";
    }
	labelList[arr.length-1].setAttribute("data-id", id);

    }
    let popuphandler = (ev)=>{
        let options = Array.from(document.querySelectorAll('#sympthom>option'));
        let id = parseInt(ev.target.getAttribute("data-value"));
        k=0;
        for(let i=0;i<options.length;i++){
            console.log(id);
            if(options[i].value==id){
                k=i;
            }
        }
        for(let [i,value] of Object.entries(sympthoms_data)){
            let id_json=parseInt(value["index"]);
            //console.log(id_json+" "+id)
            if(id_json==id && value["type"]=="categorical"){
                console.log(id_json);
                let select_field = document.querySelector("#intensity");
                select_field.innerHTML="";
                for(let [key,val] of Object.entries(value["values"])){
                    let intensity_index = parseInt(val["index"]);
                    let intensity_description = val["description"];
                    let option = document.createElement("option");
                    option.setAttribute("value", intensity_index);
                    option.innerText = intensity_description;
                    select_field.appendChild(option);
                }
                popup = document.querySelector(options[k].dataset.popupTarget);
                openPopup(popup);
                break;
            }
        }
    }
    for(let i=0;i<options.length;i++){
        options[i].addEventListener("click", popuphandler);
        options[i].addEventListener("click", handler);
    }
}
function deleteSympthom(ev){
    let id = parseInt(ev.target.parentElement.getAttribute("data-id"));

    delete categorical_dict[id];

    deleted_id = arr.indexOf(id);
    console.log(obj[id]);
	arr.splice(deleted_id,1);
    console.log(arr);

    let ttips = document.querySelectorAll(".sympthom-tooltip");
    for(let i = 0;i<ttips.length;i++){
        ttips[i].remove();
    }

    let labelList = Array.from(document.querySelectorAll("#whiteboard>label"));
    for(let j=0; j<arr.length; j++){
        if (tooltips.hasOwnProperty(arr[j])){

            let tooltip = document.createElement("span");
            tooltip.classList.add("sympthom-tooltip");
            tooltip.setAttribute("data-title", tooltips[arr[j]]);
            tooltip.innerHTML = "&#9432;";

            labelList[j].insertBefore(tooltip, labelList[j].children[1]);
            if (categorical_dict.hasOwnProperty(arr[j])){ 
                labelList[j].children[0].innerText=obj[arr[j]] + " " + categorical_dict[arr[j]];
            } else {
                labelList[j].children[0].innerText=obj[arr[j]];
            }

            button = labelList[j].children[2];
            button.style.display="inline-table";

        } else {
            if (categorical_dict.hasOwnProperty(arr[j])){ 
                labelList[j].children[0].innerText=obj[arr[j]] + " " + categorical_dict[arr[j]];
            } else {
                labelList[j].children[0].innerText=obj[arr[j]];
            }
            button = labelList[j].children[1];
            button.style.display="inline-table";
        }
        labelList[j].setAttribute("data-id", arr[j]);
    }
    j=arr.length;
    labelList[j].children[0].innerText="";
    button = labelList[j].children[1];
    button.style.display="None";
    let elem = document.querySelector(".item-label[data-value='"+id+"']").nextSibling;
    elem.dispatchEvent(new MouseEvent("click"));
}   
let attachSymptomClickHandler = ()=>{ 
    let open_button = document.querySelector(".mult-select-tag button");
    let input_box = document.querySelector("input.input");
    input_box.addEventListener("keyup", add_listener);
    open_button.addEventListener("click", add_listener);
}


let close_buttons = document.querySelectorAll(".close-button");
for(let i = 0;i<close_buttons.length;i++){
close_buttons[i].addEventListener("click", deleteSympthom);
}

const closePopupButtons = document.querySelectorAll('[data-close-button]')
const overlay = document.getElementById('overlay')


closePopupButtons.forEach(button => {
  button.addEventListener('click', () => {
    const popup = button.closest('.popup')
    closePopup(popup)
  })
  button.addEventListener('click', ()=>{
    let selected_intensity=document.querySelector('#intensity');
    let labelList = Array.from(document.querySelectorAll("#whiteboard>label"));
    let index = arr.length-1;
    let innerText = labelList[index].children[0].innerText;
    let intensity_text = selected_intensity.options[selected_intensity.selectedIndex].text;
    let intensity_model_value = selected_intensity.options[selected_intensity.selectedIndex].getAttribute("value");
    console.log(index);
    innerText = innerText+" "+intensity_text;
    labelList[index].children[0].innerText=innerText;
    categorical_dict[arr[index]] = parseInt(intensity_model_value);
})
})

function openPopup(popup) {
  if (popup == null) return
  popup.classList.add('active')
  overlay.classList.add('active')
}

function closePopup(popup) {
  if (popup == null) return
  popup.classList.remove('active')
  overlay.classList.remove('active')
}