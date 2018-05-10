# any-api-proxy
A simple proxy server that enable you to mock specific api methods
whereas other methods still requested from real API

## example

```
aproxy https://example.com/api --mockFile ./mock.json
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
