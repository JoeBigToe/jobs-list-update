pushd %OneDrive%\azureFunctions\specs

docker run --rm -d --name mongo-test azure/mongo-test

timeout /t 5 /nobreak >NUL

docker exec mongo-test bash -c "mongoimport -d jobs -c postings /tmp/import_postings.json"
docker exec mongo-test bash -c "mongoimport -d jobs -c closed /tmp/import_closed.json"

docker run --rm --name node-test --link mongo-test -v "/c/Users/jrosa2/OneDrive - Infor/azureFunctions/src/timeTrigger:/home" -p 9229:9229 node:4.8 bash -c "nodemon -L --nolazy --debug-brk=9229 /home/mock.js"

popd