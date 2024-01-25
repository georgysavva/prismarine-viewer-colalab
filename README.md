# prismarine-viewer-colalab

> Customized version of the prismarine-viewer for colalab [MineLand]()
>
> Origin: https://github.com/PrismarineJS/prismarine-viewer

## 1. Improvements

* Rendering of Player Skins
  * ![pic1](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic1.png)
* Rendering of Night
  * ![pic2](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic2.png)
  * ![pic3](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic3.png)
* Improvement of Headless Mode
  * Fixed a bug regarding the inability to render players in headless mode
  * Add a simplier API
* Free Camera Mode
  * Developers can add cameras at any position and compass in the world

## 2. How to install

* `npm install prismarine-viewer-colalab`

## 3. How to deploy

* recommande node.js version is `v18.18.2`
* exec `npm install`
* exec `npx webpack`
* exec `cp -r ./assets/skins ./public/textures/1.16.4/entity/`
* exec `npm version patch`
* exec `npm publish`
