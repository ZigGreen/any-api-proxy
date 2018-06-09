# any-api-proxy
A simple proxy server that enable you to mock specific api methods
whereas other methods still requested from real API

## example

```
aproxy start https://example.com/api \
  --mockFile ./mock.json \
  --mode=error (optional, defaults to success)              
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

## modes
Also you can choose mode of HTTP response: success or error. If you choose `error` mode HTTP response status code will be `202`

## mockScript.js
```js
module.exports = (url, params, mock) => {
    params; // POST parameters
    mock; // subset of mock.json related to url
    return mock;
};
```