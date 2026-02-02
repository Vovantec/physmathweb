<?php 
  $GameVersion="0.0.4";
?>

<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Project</title>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>

  <!--<script disable-devtool-auto src='https://cdn.jsdelivr.net/npm/disable-devtool@latest/disable-devtool.min.js'></script>-->

  <link rel="stylesheet" type="text/css" href="/css/style.css?v=<?php echo $GameVersion; ?>">
  <link rel="stylesheet" type="text/css" href="/css/gui.css?v=<?php echo $GameVersion; ?>">
  
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Alice&display=swap" rel="stylesheet">

  <script src="/js/fingerprintJS/fp.min.js"></script>
  <script src="/js/devtools/index.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script src="https://pixijs.download/v6.1.3/pixi.min.js"></script>
  <script src="https://filters.pixijs.download/v4.1.5/pixi-filters.js"></script>
  <script src="js/pixi-spine.js"></script>
  <script src="js/pixi-sound.js"></script>
  <script src="js/pixi-projection/pixi-projection.umd.js"></script>
  <script type="text/javascript" src="js/pathfinding/pathfinding-browser.min.js"></script>
  <script src="js/stats/stats.js"></script>

  <!--<link rel="stylesheet" href="js/notify/simple-notify.min.css" />
  <script src="js/notify/simple-notify.min.js"></script>-->
  <script src="js/notify.js"></script>
  <script src="https://d3js.org/d3.v7.min.js"></script>

  <script src="js/abilities.js?v=<?php echo $GameVersion; ?>"></script>
  <script src="js/devMode.js?v=<?php echo $GameVersion; ?>"></script>
  <script src="images/gui/gui.js?v=<?php echo $GameVersion; ?>"></script>
  <script src="images/gui/menu.js?v=<?php echo $GameVersion; ?>"></script>
  <script src="js/notifyGame.js?v=<?php echo $GameVersion; ?>"></script>
  <script id="mainScript" type="text/javascript" language="javascript" src="js/main.js?v=<?php echo $GameVersion; ?>"></script>
  <style>
  	html { overflow:  hidden; }
  </style>
</head>
<body>
  <div id="keys" hidden></div>
</body>
</html>