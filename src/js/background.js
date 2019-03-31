import "../img/icon-128.png";
import "../img/icon-34.png";
import "../images/get_started16.png";
import "../images/get_started32.png";
import "../images/get_started48.png";
import "../images/get_started128.png";
import { screenshot } from "./screenshot";
import GloSDK from "@axosoft/glo-sdk";

chrome.commands.onCommand.addListener(function(command) {
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    screenshot();
    //setBadge();
  });
});

/*function setBadge() {
  let gloScreens = JSON.parse(localStorage.getItem("glooshot_screens"));
  if (gloScreens) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: [105, 105, 105, 105]
    }); 
    let total = gloScreens.screens.length + 1;
    chrome.browserAction.setBadgeText({ text: total + "" });
  }
}

setBadge();*/

var contextMenuItem = {
  id: "createGloCard",
  title: "Create Glo Card",
  contexts: ["selection"]
};

chrome.contextMenus.create(contextMenuItem, () => chrome.runtime.lastError);

chrome.contextMenus.onClicked.addListener(function(clickData) {
  if (clickData.menuItemId === "createGloCard" && clickData.selectionText) {
    chrome.storage.sync.get(["token"], async function(result) {
      let token = result.token;

      let boardId = localStorage.getItem("board_id");
      let columnId = localStorage.getItem("column_id");
      if (boardId) {
        let card = { name: "", description: { text: "" }, column_id: columnId };
        let pattern = /(.+:\/\/)?([^\/]+)(\/.*)*/i;
        let url = pattern.exec(clickData.pageUrl);
        card.name = "Glo card - " + url[2];
        card.description.text = `${clickData.selectionText} \n [${url[2]}](${
          clickData.pageUrl
        }) `;
        try {
          let response = await GloSDK(token).boards.cards.create(boardId, card);
          if (response.id) {
            let notificationOptions = {
              type: "basic",
              iconUrl: "get_started48.png",
              title: "Glo Card Created",
              message: `Glo Card: ${response.name} created successfully!`
            };
            chrome.notifications.create("glocard", notificationOptions);
          }
        } catch (error) {
          let notificationOptions = {
            type: "basic",
            iconUrl: "get_started48.png",
            title: "Glo Card Error",
            message: error.response.data.message
          };
          chrome.notifications.create("glocard", notificationOptions);
        }
      } else {
        var notificationOptions = {
          type: "basic",
          iconUrl: "get_started48.png",
          title: "Error creating Glo Card",
          message:
            "To create a Glo Card is necessary to select a board and a column!"
        };

        chrome.notifications.create("errorCreateGloCard", notificationOptions);
      }
    });
  }
});
