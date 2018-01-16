# any-api-proxy
A simple proxy server that enable you to mock specific api methods
whereas other methods still requested from real API

## use
    aproxy
      --api=https://example.com/api (required)
      --mockFile=./path/to/mock/data (optional, defaults to ./mock.json)

## example

```
aproxy --api=https://example.com/api --mockFile=./mock.json
```

to mock https://example.com/api/keyA/keyB use mock file:
```json
{
  "keyA": {
    "keyB": {
      "test": "data"
    }
  }
}
```
