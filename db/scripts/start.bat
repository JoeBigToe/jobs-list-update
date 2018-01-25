docker run --rm --name mongo-test -d azure/mongo-test
docker exec mongo-test bash -c "mongoimport -d jobs -c postings /tmp/import_postings.json"
docker exec mongo-test bash -c "mongoimport -d jobs -c closed /tmp/import_closed.json"
