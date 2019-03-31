function screenshot() {
  chrome.tabs.getSelected(null, function(tab) {
    var PIXEL_RATIO = getPixelRatio();

    let date = new Date();
    let dateFormat = date.getFullYear() + '_' + (date.getMonth() +1) + '_' + date.getDate() + '_' + date.getHours() + date.getMinutes() + date.getSeconds(); 
    var cfg = {
      url: tab.url,
      filename: "GloShot_" + dateFormat,
      targetWidth: tab.width,
      targetHeight: tab.height,
      totalWidth: null,
      totalHeight: null,
      pixelRatio: PIXEL_RATIO,
      originalWidth: tab.width, 
    };

    chrome.tabs.get(tab.id, function(tab) {
      cfg.totalWidth = tab.width;
      cfg.totalHeight = tab.height;
      capturePage(cfg);
    });
  });
}

function getPixelRatio() {
  var ctx = document.createElement("canvas").getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    bsr = ctx.webkitBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
  return dpr / bsr;
}

function capturePage(cfg) {
  function createCanvas(cfg) {
    var canvas = document.createElement("canvas");
    var w = cfg.totalWidth;
    var h = cfg.totalHeight;
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  chrome.tabs.captureVisibleTab(null, { format: "png", quality: 50 }, function(
    dataURI
  ) {
    if (dataURI) {
      var canvas = createCanvas(cfg);
      var ctx = canvas.getContext("2d");
      var image = new Image();
      image.onload = function() {
        ctx.drawImage(image, 0, 0, cfg.totalWidth, cfg.totalHeight);
      };
      image.src = dataURI;

      let files = JSON.parse(localStorage.getItem("glooshot_screens"));
      if (files) {
        let screenData = { data: dataURI, originalName: cfg.filename };
        files.screens.push(screenData);
        localStorage.setItem("glooshot_screens", JSON.stringify(files));
      } else {
        let screenData = {
          screens: [{ data: dataURI, originalName: cfg.filename }]
        };
        localStorage.setItem("glooshot_screens", JSON.stringify(screenData));
      }

      var notificationOptions = {
        type: "basic",
        iconUrl: "get_started48.png",
        title: "GloShot",
        message:
          "Screenshot taken!"
      };

      chrome.notifications.create("screenshot", notificationOptions);

    }
  });
}

function dataUrlToBlob(dataURI) {
  var byteString = atob(dataURI.split(",")[1]);
  var mimeString = dataURI
    .split(",")[0]
    .split(":")[1]
    .split(";")[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export{ screenshot, dataUrlToBlob };
