echo "DEPLOY: begin"
npx webpack
cp -r ./assets/skins ./public/textures/1.16.4/entity/
echo "DEPLOY: npx webpack done"

rm -rf ../Mineflayer/node_modules/prismarine-viewer/
cp -r ../prismarine-viewer-colalab/ ../Mineflayer/node_modules/prismarine-viewer
rm -rf ../Mineflayer/node_modules/prismarine-viewer/node_modules/
echo "DEPLOY: all done"