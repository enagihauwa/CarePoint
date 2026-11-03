#!/bin/bash
# Task 4, steps 6 and 7: runs the Task 3 attack requests and more against the Task 4 server.
BASE=http://localhost:3077
SP=/c/Users/USER/AppData/Local/Temp/claude/c--Users-USER-Desktop-CarePoint/89ec5ed9-2e9c-4a32-bda1-4f4577164a01/scratchpad
J='Content-Type: application/json'

# show: print the request, then only the status line and the body (headers vary and are noise)
show() { # $1 = label, $2 = data, rest = extra curl args
  local label="$1" data="$2"; shift 2
  echo "--- $label"
  echo "\$ curl -i -X POST $BASE$PATH_ -H \"Content-Type: application/json\" -d '$data'"
  curl -s -i -X POST "$BASE$PATH_" -H "$J" "$@" -d "$data" | tr -d '\r' | awk 'NR==1{print} /^\{|^\[/{print}'
  echo
}

PATH_=/api/register
echo "##### A. The three Task 3 attack requests, sent again (register)"
show "A1 one letter name, a@b, abc, password of spaces" '{"name":"a","email":"a@b","phone":"abc","password":"   "}'
show "A2 empty body" '{}'
echo "--- A3 a 200,000-character name"
echo "\$ curl -i -X POST $BASE/api/register -H \"Content-Type: application/json\" --data @big.json"
curl -s -i -X POST "$BASE/api/register" -H "$J" --data @"$(cygpath -w "$SP/big.json")" | tr -d '\r' | awk 'NR==1{print} /^\{|^\[/{print}'
echo

echo "##### B. More server checks"
show "B1 valid, but padded and mixed case" '{"name":"  Padded Name  ","email":"  MixedCase@Example.COM ","phone":"0803 123-4567","password":"correct horse battery","termsAccepted":true}'
show "B2 password '  abcdef' (8 characters counting the spaces, so NOT trimmed)" '{"name":"No Trim","email":"notrim@example.com","phone":"08000000002","password":"  abcdef","termsAccepted":true}'
show "B3 password ' abcdef' (7 characters)" '{"name":"No Trim","email":"notrim2@example.com","phone":"08000000002","password":" abcdef","termsAccepted":true}'
show "B4 terms not accepted (false)" '{"name":"Terms Test","email":"terms@example.com","phone":"08000000003","password":"correct horse battery","termsAccepted":false}'
show "B5 terms sent as the text \"true\"" '{"name":"Terms Test","email":"terms@example.com","phone":"08000000003","password":"correct horse battery","termsAccepted":"true"}'
show "B6 name sent as a number" '{"name":12345,"email":"num@example.com","phone":"08000000004","password":"correct horse battery","termsAccepted":true}'
echo "--- B7 request body larger than the 4 KB limit (declared)"
big=$(node -e "process.stdout.write(JSON.stringify({name:'x'.repeat(5000)}))")
curl -s -i -X POST "$BASE/api/register" -H "$J" -d "$big" | tr -d '\r' | awk 'NR==1{print} /^\{|^\[/{print}'; echo
show "B8 not JSON at all" 'this is not json'
echo "##### C. Left on purpose for later (still accepted):"
show "C1 +0000000000 (defect O3)" '{"name":"Nonsense Number","email":"nonsense@example.com","phone":"+0000000000","password":"correct horse battery","termsAccepted":true}'
show "C2 the same email again (defect O2, needs the schema)" '{"name":"Padded Two","email":"mixedcase@example.com","phone":"0803 123-4567","password":"correct horse battery","termsAccepted":true}'

echo "##### D. Login and reset answer generically"
PATH_=/api/login
show "D1 login: not an email" '{"email":"nope","password":"x"}'
show "D2 login: empty password" '{"email":"a@example.com","password":""}'
show "D3 login: password far too long" "{\"email\":\"a@example.com\",\"password\":\"$(node -e "process.stdout.write('p'.repeat(100))")\"}"
show "D4 login: valid shape" '{"email":"a@example.com","password":"anything"}'
PATH_=/api/reset
show "D5 reset: not an email" '{"email":"nope"}'
show "D6 reset: valid shape" '{"email":"a@example.com"}'
