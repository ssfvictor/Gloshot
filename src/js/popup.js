import GloSDK from "@axosoft/glo-sdk";
import secrets from "../secrets.production";
import { dataUrlToBlob } from "./screenshot";

//onload = function() {
let login = document.getElementById("btnLogin");
login.addEventListener("click", () => authentication(), false);

const authentication = async () => {
  let redirectUrl = chrome.identity.getRedirectURL('provider_cb');
  
    let authUrl =
    "https://app.gitkraken.com/oauth/authorize/?" +
    "client_id=" +
    secrets.CLIENT_ID +
    "&" +
    "response_type=code&" +
    "&scope=" +
    "board:write board:read user:write user:read" +
    "&state=" +
    secrets.STATE +
    "&redirect_uri=" +
    encodeURIComponent(redirectUrl) +
    "&redirect_type=code";

  chrome.identity.launchWebAuthFlow(
    { url: authUrl, interactive: true },

    async function(responseUrl) {
      let url = new URL(responseUrl);
      
      const params = getParamsUrl(url);

      const response = await fetch(
        "https://api.gitkraken.com/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            code: params.code,
            grant_type: "authorization_code",
            client_id: secrets.CLIENT_ID,
            client_secret: secrets.CLIENT_SECRET
          })
        }
      );

      const json = await response.json();

      chrome.storage.sync.set({ token: json.access_token });
      init();
    }
  );
};

function getParamsUrl(url){
  let queryParam = {};
  queryParam = url.search
  .replace("?", "")
  .split("&")
  .reduce((a, b) => {
    let [key, val] = b.split("=");
    a[key] = val;
    return a;
  }, queryParam);
  return queryParam;
}

function init() {
  chrome.storage.sync.get("token", function(result) {
    let token = result.token;
    let login = document.getElementById("login");
    let app = document.getElementById("app");
    let user = document.getElementById("hidUser");

    if (!result.token) {
      login.hidden = false;
      app.hidden = true;
    } else {
      app.hidden = false;
      user.hidden = false;
      login.hidden = true;
      initApp();
    }
  });
}

function initApp() {
  chrome.storage.sync.get(["token", "user"], async function(result) {
    let token = result.token;
    let username = "";
    try {
      if (result.user) {
        username = result.user;
      } else {
        if (token) {
          const user = await GloSDK(token).users.getCurrentUser();
          chrome.storage.sync.set({ user: user.username });
          username = user.username;
          localStorage.clear();
        }
      }
      let userApp = document.getElementById("user");
      userApp.textContent = username;
      initBoards();
    } catch (error) {
      console.log(error);
    }
  });
}

function initBoards() {
  chrome.storage.sync.get(["token", "user"], async function(result) {
    let token = result.token;
    let username = "";
    try {
      if(token) {
        const boards = await GloSDK(token).boards.getAll({
          fields: ["id", "name", "columns"]
        });
        chrome.storage.sync.set({ boards: boards });
        loadBoards(boards);
        initTableAttachments();
      }
    } catch (error) {
      console.log(error);
    }
  });
}

function loadBoards(boards) {
  let boardSelect = document.getElementById("selBoards");
  let columnsSel = document.getElementById("selColumns");
  boardSelect.length = 1;

  let option;
  boards.forEach(element => {
    option = document.createElement("option");
    option.text = element.name;
    option.value = element.id;
    boardSelect.add(option);
  });

  let indexBoardId = boards.findIndex(
    b => b.id === localStorage.getItem("board_id")
  );
  
  if (indexBoardId === -1) {
    boardSelect.selectedIndex = 0;
  } else {
    boardSelect.selectedIndex = indexBoardId + 1;
  }
  boardSelect.dispatchEvent(evtBoard);
  columnsSel.dispatchEvent(evtColumn);
}

let boardsSelect = document.getElementById("selBoards");
var evtBoard = new Event("change");
var evtColumn = new Event("change");

boardsSelect.addEventListener(evtBoard.type, function(e) {
  chrome.storage.sync.get(["token", "boards"], async function(result) {
    let columnsSel = document.getElementById("selColumns");
    let cardsSel = document.getElementById("selCards");
    columnsSel.length = 1;

    if (boardsSelect.selectedIndex == 0) {
      columnsSel.disabled = true;
      cardsSel.disabled = true;
      localStorage.setItem("column_id", 0);
      localStorage.setItem("card_id", 0);
    } else {
      columnsSel.disabled = false;
    }

    let selectedBoard = boardsSelect.options[boardsSelect.selectedIndex];
    let board = result.boards.filter(
      board => board.id === selectedBoard.value
    )[0];

    localStorage.setItem("board_id", selectedBoard.value);

    let option;
    let indexColumnId = -1;
    if (board) {
      board.columns.forEach(column => {
        option = document.createElement("option");
        option.text = column.name;
        option.value = column.id;
        columnsSel.add(option);
      });

      indexColumnId = board.columns.findIndex(
        c => c.id === localStorage.getItem("column_id")
      );
    }

    if (indexColumnId === -1) {
      columnsSel.selectedIndex = 0;
    } else {
      columnsSel.selectedIndex = indexColumnId + 1;
    }
    columnsSel.dispatchEvent(evtColumn);
  });
});

let columnsSelect = document.getElementById("selColumns");

columnsSelect.addEventListener(evtColumn.type, function(e) {
  chrome.storage.sync.get(["token", "boards"], async function(result) {
    let cardsSel = document.getElementById("selCards");
    let token = result.token;

    cardsSel.length = 1;

    if (columnsSelect.selectedIndex != 0) {
      cardsSel.disabled = false;
    } else {
      cardsSel.disabled = true;
    }
    let selectedBoard = boardsSelect.options[boardsSelect.selectedIndex];
    let selectedColumn = columnsSelect.options[columnsSelect.selectedIndex];

    localStorage.setItem("column_id", selectedColumn.value);
    let indexCardId = -1;
    let option;
    if (selectedBoard.value != 0 && selectedColumn.value != 0) {
      let cards = await GloSDK(token).boards.columns.getCards(
        selectedBoard.value,
        selectedColumn.value
      );

      cards.forEach(column => {
        option = document.createElement("option");
        option.text = column.name;
        option.value = column.id;
        cardsSel.add(option);
      });

      indexCardId = cards.findIndex(
        c => c.id === localStorage.getItem("card_id")
      );
    }

    if (indexCardId === -1) {
      cardsSel.selectedIndex = 0;
    } else {
      cardsSel.selectedIndex = indexCardId + 1;
    }
  });
});

let cardSeslect = document.getElementById("selCards");

cardSeslect.addEventListener("change", function(e) {
  let selectedCard = cardSeslect.options[cardSeslect.selectedIndex];
  localStorage.setItem("card_id", selectedCard.value);
});

function initTableAttachments() {
  let gloshotScreens = JSON.parse(localStorage.getItem("glooshot_screens"));
  let screens;
  if (gloshotScreens) {
    screens = gloshotScreens.screens;
    let table = document.getElementById('tblAttachment');
    let i = 0;
    
    let contentTable = "";
    if (screens) {
      screens.forEach(screen => {
        contentTable += (`
          <tr><td><a class='thumbnail' href='#'> ${screen.originalName} 
          <span><img src="${
            screen.data
          }" width="300px" height="300px"></span></a> 
          </td><td>
          <button class="btn" name="btnRemoveAttach" value="${
            screen.originalName
          }"><i class="fa fa-trash"></i></button>
          </td></tr>`);
        i++;
      });
      table.innerHTML = contentTable;
    }
    let btnsRemoveAttach = document.getElementsByName("btnRemoveAttach");
    Array.prototype.forEach.call(btnsRemoveAttach, function addClickListener(btn
) {
      btn.addEventListener("click", () => removeAttachment(btn), true);
    });
  }
}

function removeAttachment(btn) {
  let i = btn.parentNode.parentNode.rowIndex;
  document.getElementById("tblAttachment").deleteRow(i);

  // need to remove the object in localstorage ...
  let screens = JSON.parse(localStorage.getItem("glooshot_screens")).screens;

  screens = screens.filter(screen => screen.originalName !== btn.value);

  localStorage.setItem(
    "glooshot_screens",
    JSON.stringify({ screens: screens })
  );
}

let sendFiles = document.getElementById("btnSendFiles");
sendFiles.addEventListener("click", () => sendAttachments(), false);

const sendAttachments = async () => {
  chrome.storage.sync.get(["token"], async function(result) {
    let board_id = localStorage.getItem("board_id");
    let card_id = localStorage.getItem("card_id");
    let token = result.token;
    let comment = { text: "" };
    let screens = JSON.parse(localStorage.getItem("glooshot_screens")).screens;
    let formData = new FormData();

    for (const screen of screens) {
      let blob = dataUrlToBlob(screen.data);
      formData.append(screen.originalName, blob, screen.originalName);

      const response = await fetch(
        `https://gloapi.gitkraken.com/v1/glo/boards/${board_id}/cards/${card_id}/attachments`,
        {
          method: "POST",
          headers: {
            Accept: "*/*",
            Authorization: "Bearer " + token
          },
          body: formData
        }
      );

      const json = await response.json();
      comment.text += comment.text + `![image](${json.url})`;

      formData = new FormData();
    }

    try {
      let responseComment = await GloSDK(token).boards.cards.comments.create(
        board_id,
        card_id,
        comment
      );
      localStorage.removeItem("glooshot_screens");
      deleteRowsAttachments();
      chrome.browserAction.setBadgeText({ text: total + "" });  
    } catch (error) {}
  });
};
function deleteRowsAttachments() {
  var table = document.getElementById("tblAttachment");
  for (var i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
}

init();
