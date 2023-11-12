echo "DEPLOY: begin"

npx webpack
echo "DEPLOY: npx webpack done"

cp -r ./assets/skins ./public/textures/1.18.1/entity/
rm -rf ../Mineflayer/node_modules/prismarine-viewer/
cp -r ../prismarine-viewer-colalab/ ../Mineflayer/node_modules/prismarine-viewer
rm -rf ../Mineflayer/node_modules/prismarine-viewer/node_modules/
echo "DEPLOY: all done"