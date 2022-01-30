//  _   _  _    _  _  __           _____    ____   _   _   _____
//  | \ | || |  | || |/ /    /\    |  __ \  / __ \ | \ | | / ____|
//  |  \| || |  | || ' /    /  \   | |__) || |  | ||  \| || |  __
//  | . ` || |  | ||  <    / /\ \  |  ___/ | |  | || . ` || | |_ |
//  | |\  || |__| || . \  / ____ \ | |     | |__| || |\  || |__| |
//  |_| \_| \____/ |_|\_\/_/    \_\|_|      \____/ |_| \_| \_____|
//
//  NUKAPONG - A Kim vs Don story
//  Copyright ©2017-2018 William Gacquer aka Y-boY aka M4N


///////////////////////////////////////////////////////////////
// PHASE 0 : Définition des variables principales
//

// stockons les dimensions de l'aire de jeu
var gameWidth = window.innerWidth;
var gameHeight = window.innerHeight;

// Le jeu est initialement conçu pour tourner en résolution de 800x600
// d'où les ratios suivants pour ajuster la scène à l'écran.
var hRatio = gameHeight / 600;
var wRatio = gameWidth / 800;

// 3 sprites, 2 pour les joueurs et un pour la balle
var player1;
var player2;
var ball;

// vitesse minimale de la balle en pixel/s
var baseSpeed = gameWidth/2;
// vitesse réelle de la balle en pixel/s
var speed = baseSpeed;

// Les 4 touches pour bouger les joueurs
var player1KeyUP;
var player1KeyDOWN;
var player2KeyUP;
var player2KeyDOWN;

// Le score est un texte composé des scores individuels de chaque joueur
var score;
var player1Score = 0;
var player2Score = 0;

// Une variable pour l'animation du joueurs qui perd un point
var tween;

// Une vidéo
var nukeVideo;
// ... et le sprite la contenant
var nukeSprite;
// ... qui ne sera jouée que si withVideo est vrai
var withVideo = true;

// Deux variables pour stocker un "shader" nucléaire
var filter;
var fireball;
// ... qui ne sera joué que si withShader est vrai
var withShader = true;

// Le son des collisions entre la balle et les joueurs
var bing;

// et finalement, un objet Phaser.Game pour le jeu.
var game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

///////////////////////////////////////////////////////////////
// PHASE 1 : Phaser preload. On charge les "assets" et attribue quelques caractériques
//
function preload() {
    // En production, la racine du site est
    // game.load.baseURL = 'https://y-boy.com/pong/';
    // En phase de développement, la racine du site est
    // game.load.baseURL = 'http://localhost:8080/';

    // Pour éviter les problèmes de contrôle d'accès "CORS"
    // ( voir https://developer.mozilla.org/fr/docs/HTTP/Access_control_CORS )
    game.load.crossOrigin = 'anonymous';
    // Je pourrais charge mes les images des joueurs ainsi :
    //    game.load.image('Trump', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Donald_Trump_%28TheDon%29.png');
    //    game.load.image('Kim', 'https://upload.wikimedia.org/wikipedia/commons/3/31/Kim_III.png');
    //    game.load.image('NuclearBall', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Nuclear_symbol.svg/1024px-Nuclear_symbol.svg.png');
    // mais je préfère les images de mon ami illustrateur Feyd ( https://edlekgarden.blogspot.fr/ )
    game.load.image('Trump', 'pics/don_by_feyd_color.png');
    game.load.image('Kim', 'pics/kim_by_feyd_color.png');
    game.load.image('NuclearBall', 'nuclear.png');

    // Prenons une fonte "bitmap" de gamer old school
    game.load.bitmapFont('carrier_command', 'fonts/carrier_command.png', 'fonts/carrier_command.xml');

    // Préchargeons une vidéo d'explosion nucléaire
    game.load.video('Nuke','pics/NuclearExplosion.mp4');

    // et un son de compteur geiger pour les collisions
    game.load.audio('bing', 'sounds/geiger.wav');
}

///////////////////////////////////////////////////////////////
// PHASE 2 : Phaser create. On prépare la scène de jeu
//

function create() {
    // Tout commence sur un beau fond noir
    game.stage.backgroundColor = '#000000';
    // ... sur lequel on ajoute une boule de feu. Voir la fonction extra()
    if (withShader) {
        extra();
    }
    // Demandons à Phase de nous offrir une physique de jeu d'Arcade
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Disposons une vidéo cachée qui ne se révelera que quand un joueur manque la balle
	if (withVideo) {
		nukeVideo = game.add.video('Nuke');
		nukeVideo.loop = false;
        nukeVideo.onComplete = new Phaser.Signal();
        nukeVideo.onPlay = new Phaser.Signal();
		nukeSprite = nukeVideo.addToWorld(game.world.centerX, game.world.centerY, 0.5, 0.5, gameHeight/nukeVideo.height, gameHeight/nukeVideo.height);
		nukeSprite.alpha = 0;
        nukeVideo.onComplete.add(function() {
            game.add.tween(nukeSprite).to( { alpha: 0 }, 500, Phaser.Easing.Linear.None, true, 0, 0, false);
        });
        nukeVideo.onPlay.add(function() {
            game.add.tween(nukeSprite).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 0, false);
        });
    }

    // Affichons le score, nul au début de jeu
	score = game.add.bitmapText(gameWidth/2, gameHeight/10, 'carrier_command','DON 0 - 0 KIM', 20 * wRatio);
	score.anchor.x = 0.5;
    score.anchor.y = 0.5;
    score.centerX = gameWidth/2;

    // Plaçons et les joueurs et la balle
    player1 = game.add.sprite(0, 300 * hRatio, 'Trump');
    player2 = game.add.sprite(0, 300 * hRatio, 'Kim');
    ball = game.add.sprite(400 * wRatio, 300 * hRatio, 'NuclearBall');

    // ... et ajustons leurs tailles
    player1.scale.setTo(0.1 * hRatio, 0.1 * hRatio);
    player2.scale.setTo(0.1 * hRatio, 0.1 * hRatio);
    ball.scale.setTo(0.03 * hRatio, 0.03 * hRatio);

    // ... laissons Phaser gérer la dynamique des joueurs et de la balle
    game.physics.arcade.enable(player1);
    game.physics.arcade.enable(player2);
    game.physics.arcade.enable(ball);
    player1.body.collideWorldBounds = true;
    player1.body.immovable = true;
    player2.body.collideWorldBounds = true;
    player2.body.immovable = true;
    ball.body.collideWorldBounds = true;
    ball.body.bounce.y = 1;
    ball.body.bounce.x = 1;
    ball.body.velocity.x = baseSpeed;
    ball.body.velocity.y = 0;

    // si la balle entre en collision, invoquons la fonction boom
    ball.body.onCollide = new Phaser.Signal();
    ball.body.onCollide.add(boom, this);

    // Voici la gestion des touches
    player1KeyUP = game.input.keyboard.addKey(Phaser.KeyCode.A);
    player1KeyDOWN = game.input.keyboard.addKey(Phaser.KeyCode.Q);
    player2KeyUP = game.input.keyboard.addKey(Phaser.KeyCode.P);
    player2KeyDOWN = game.input.keyboard.addKey(Phaser.KeyCode.L);

    // et préparons le son des collisions
    bing = game.add.audio('bing');

}

// EXTRA : La boule de feu, codée avec un "shader" pour les plus costauds.
// Attention, ce n'est pas du javascript !!!
function extra () {
    var fragmentSrc = [
        "precision mediump float;",

        "uniform float     time;",
        "uniform vec2      resolution;",
        "uniform vec2      mouse;",

        "// Yuldashev Mahmud Effect took from shaderToy mahmud9935@gmail.com",

        "float snoise(vec3 uv, float res)",
        "{",
        "const vec3 s = vec3(1e0, 1e2, 1e3);",

        "uv *= res;",

        "vec3 uv0 = floor(mod(uv, res))*s;",
        "vec3 uv1 = floor(mod(uv+vec3(1.), res))*s;",

        "vec3 f = fract(uv); f = f*f*(3.0-2.0*f);",

        "vec4 v = vec4(uv0.x+uv0.y+uv0.z, uv1.x+uv0.y+uv0.z,",
        "uv0.x+uv1.y+uv0.z, uv1.x+uv1.y+uv0.z);",

        "vec4 r = fract(sin(v*1e-1)*1e3);",
        "float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);",

        "r = fract(sin((v + uv1.z - uv0.z)*1e-1)*1e3);",
        "float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);",

        "return mix(r0, r1, f.z)*2.-1.;",
        "}",

        "void main( void ) {",

        "vec2 p = -.5 + gl_FragCoord.xy / resolution.xy;",
        "p.x *= resolution.x/resolution.y;",

        "float color = 3.0 - (3.*length(2.*p));",

        "vec3 coord = vec3(atan(p.x,p.y)/6.2832+.5, length(p)*.4, .5);",

        "for(int i = 1; i <= 7; i++)",
        "{",
        "float power = pow(2.0, float(i));",
        "color += (1.5 / power) * snoise(coord + vec3(0.,-time*.05, time*.01), power*16.);",
        "}",

        "gl_FragColor = vec4( color, pow(max(color,0.),2.)*0.4, pow(max(color,0.),3.)*0.15 , 1.0);",

        "}"
    ];

    filter = new Phaser.Filter(game, null, fragmentSrc);
    filter.setResolution(gameWidth, gameHeight);

    fireball = game.add.sprite();
    fireball.width = gameWidth;
    fireball.height = gameHeight;

    fireball.filters = [ filter ];
}

// Boom est invoquée à chaque collision.
function boom (zeBall, zePaddle) {
    // La balle rebondit et accélère mais ne va pas plus vite que 2 fois la vitesse de base
    if ( speed < 2 * baseSpeed ) {
        speed += (10 * wRatio);
        zeBall.body.velocity.x = Math.sign(zeBall.body.velocity.x) * speed;
    }
    zeBall.body.velocity.y = zePaddle.body.velocity.y;
    // ça crépite!
    bing.play();
}

///////////////////////////////////////////////////////////////
// PHASE 3 : Phase update() est appelée en boucle pendant le jeu.
//           C'est la fameuse "boucle de jeu"
//
function update () {
    // un anime la boule de feu
    filter.update();

    // On gère les collisions
    game.physics.arcade.collide(ball, player1);
    game.physics.arcade.collide(ball, player2);

    // On bouge les joueurs
    player1.body.x = gameWidth/20;
    player1.body.velocity.x = 0;
    player1.body.velocity.y = 0;
    player2.body.x = 19*gameWidth/20 - player2.body.width;
    player2.body.velocity.x = 0;
    player2.body.velocity.y = 0;

    if (player1KeyUP.isDown)
    {
        player1.body.velocity.y = -speed;
    }
    else if (player1KeyDOWN.isDown)
    {
        player1.body.velocity.y = speed;
    }
    
    if (player2KeyUP.isDown)
    {
        player2.body.velocity.y = -speed;
    }
    else if (player2KeyDOWN.isDown)
    {
        player2.body.velocity.y = speed;
    }

    if ( ball.body.position.x < 1 ) {
        // Si la balle frappe le côté gauche, Donald Trump prend un coup et Kim Jon Un prend un point.
        console.log("Trump is dead");
        speed = baseSpeed;
        player2Score++;
        ball.body.position.x = gameWidth/2;
        ball.body.position.y = gameHeight/2;
        ball.body.velocity.x = +speed;
        ball.body.velocity.y = 0;
        game.add.tween(player1).to( { alpha: 0 }, 666, Phaser.Easing.Linear.None, true, 0, 0, true);
		if (withVideo) nukeVideo.play();
		printScore();
    } else if ( ball.body.position.x > gameWidth-ball.body.width-1 ) {
        // Si la balle frappe le côté droit, Donald Trump prend un point et Kim Jon Un prend un coup.
        console.log("Kim is dead");
        speed = baseSpeed;
        player1Score++;
        ball.body.position.x = gameWidth/2;
        ball.body.position.y = gameHeight/2;
        ball.body.velocity.x = -speed;
        ball.body.velocity.y = 0;
        game.add.tween(player2).to( { alpha: 0 }, 666, Phaser.Easing.Linear.None, true, 0, 0, true);
        if (withVideo) nukeVideo.play();
        printScore();
    }
}

// printScore rafraichit le score
function printScore() {
    score.text = 'DON ' + player1Score + ' - ' + player2Score + ' KIM';
}

///////////////////////////////////////////////////////////////
// PHASE 4 : render n'est pas implémentée.
//
function render () {
}

///////////////////////////////////////////////////////////////
// PHASE 5 : Gestion du redimensionnement de la fenêtre
//

// Si la fenêtre de jeu est redimensionnée, on appelle la fonction wgResizeWindow
window.addEventListener("resize", wgResizeWindow);
function wgResizeWindow() {
    gameWidth = window.innerWidth;
    gameHeight = window.innerHeight;
    game.scale.setGameSize(gameWidth, gameHeight);
    hRatio = gameHeight / 600;
    wRatio = gameWidth / 800;
    if (typeof player1 !== "undefined"){
        player1.scale.setTo(0.1 * hRatio, 0.1 * hRatio);
    }
    if (typeof player2 !== "undefined") {
        player2.scale.setTo(0.1 * hRatio, 0.1 * hRatio);
    }
    if (typeof ball !== "undefined") {
        ball.scale.setTo(0.03 * hRatio, 0.03 * hRatio);
    }
    if (typeof filter !== "undefined") {
        filter.setResolution(gameWidth, gameHeight);
        fireball.width = gameWidth;
        fireball.height = gameHeight;
        fireball.centerX = gameWidth / 2;
        fireball.centerY = gameHeight / 2;
    }
    if (typeof score !== "undefined") {
        score.fontSize = 20 * wRatio;
        score.centerX = gameWidth / 2;
        score.centerY = gameHeight / 10;
    }
    if (typeof nukeSprite !== "undefined") {
        nukeSprite.scale.setTo(gameHeight / nukeVideo.height, gameHeight / nukeVideo.height);
        nukeSprite.centerX = game.world.centerX;
        console.log("nukeSprite.centerX : " + nukeSprite.centerX );
        nukeSprite.centerY = game.world.centerY;
        console.log("nukeSprite.centerY : " + nukeSprite.centerY );
    }
}