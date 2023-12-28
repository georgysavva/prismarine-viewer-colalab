# prismarine-viewer-colalab

> Customized version of the prismarine-viewer for colalab
>
> Origin: https://github.com/PrismarineJS/prismarine-viewer

## 1. Improvements

* Rendering of player skins
  * ![pic1](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic1.png)
* Rendering of night
  * ![pic2](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic2.png)
  * ![pic3](https://raw.githubusercontent.com/YXHXianYu/prismarine-viewer-colalab/master/README/pic3.png)

## 2. How to install

* `npm install prismarine-viewer-colalab`

## 3. How to build

* recommande node.js version is `v18.18.2`
* exec `npm install`
* exec `npx webpack`
* exec `cp -r ./assets/skins ./public/textures/1.16.4/entity/`
* exec `npm version patch`
* exec `npm publish`
