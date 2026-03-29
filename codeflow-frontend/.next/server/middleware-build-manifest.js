self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/discuss": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/discuss.js"
    ],
    "/messages": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/messages.js"
    ],
    "/network": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/network.js"
    ],
    "/playground": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/playground.js"
    ],
    "/problems": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/problems.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];