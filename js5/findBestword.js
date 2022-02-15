mixins = mixins.concat([
  {
    data() {
      return {
        letters: {
          l1: null,
          l2: null,
          l3: null,
          l4: null,
          l5: null,
        },
        ignores: [],
        breakeKeyboard: ["p", "l"],
        bestWords: [],
        lang: "pt",
        inputFocus: "l1",
        noBestWord: false,
        languages: [
          { value: "pt", text: "Português" },
          { value: "en", text: "English" },
        ],
        dialogConfig: false,
        dialogBestWords: false,
        dialogHelp: false,
        sendWord: null,
        snackbar: false,
        snackbarText: null,
        lettersMust: [],
      };
    },
    computed: {
      keyboard() {
        return "q,w,e,r,t,y,u,i,o,p,a,s,d,f,g,h,j,k,l,z,x,c,v,b,n,m".split(",");
      },
      matches() {
        return [
          this.letters.l1,
          this.letters.l2,
          this.letters.l3,
          this.letters.l4,
          this.letters.l5,
        ];
      },
      musts() {
        return this.lettersMust.map((m) => m.letters).flat();
      },
      matchLetterWithRegex() {
        const el = this;
        return `${el.letterOrHifen(this.letters.l1)}${el.letterOrHifen(
          this.letters.l2
        )}${el.letterOrHifen(this.letters.l3)}${el.letterOrHifen(
          this.letters.l4
        )}${el.letterOrHifen(this.letters.l5)}`;
      },
      lettersEmpty() {
        return this.matchLetterWithRegex == "-----";
      },
      disableSearch() {
        return (
          this.lettersEmpty &&
          this.musts.length === 0 &&
          this.ignores.length === 0
        );
      },
    },
    methods: {
      resetLetterMust(count) {
        this.lettersMust = [];
        for (let index = 0; index < count; index++) {
          this.addLetter();
        }

        this.resizeMustContainer();
      },
      addLetter() {
        const el = this;
        const currentCount = el.lettersMust.length;
        el.lettersMust.push({
          position: currentCount,
          letters: [],
        });
      },

      getUserId() {
        let userId = localStorage.getItem("userId");
        if (!userId) {
          userId = Math.random().toString().replace("0.", "");
          localStorage.setItem("userId", userId);
        }
        _rollbarConfig.payload.person.id = parseInt(userId);
        return userId;
      },
      getCurrentLanguage() {
        const currentLang = (navigator.language || navigator.userLanguage)
          .toLowerCase()
          .split("-")[0];
        const availableLanguages = words.map((m) => m.lang);
        if (availableLanguages.includes(currentLang)) {
          return currentLang;
        }

        return "en";
      },
      setFocus(letter) {
        this.letters[letter] = null;
        this.inputFocus = letter;
      },
      clear() {
        this.letters.l1 = null;
        this.letters.l2 = null;
        this.letters.l3 = null;
        this.letters.l4 = null;
        this.letters.l5 = null;
        this.ignores = [];
        this.inputFocus = "l1";
        this.resetLetterMust(5);
      },
      toggleKeyboard(letter) {
        if (this.inputFocus == "ignore") {
          const idx = this.ignores.indexOf(letter);
          if (idx > -1) {
            this.ignores.splice(idx, 1);
          } else {
            this.ignores.push(letter);
            this.removeMust(letter);
            this.removeMatch(letter);
          }
        } else if (this.inputFocus.includes("must-")) {
          const position = this.inputFocus.split("-")[1];
          this.toggleMust(position, letter);
        } else {
          this.removeIgnore(letter);
          if (this.letters[this.inputFocus] == letter) {
            this.letters[this.inputFocus] = null;
          } else {
            this.letters[this.inputFocus] = letter;
          }

          if (this.inputFocus !== "l5") {
            const l = parseInt(this.inputFocus.replace("l", ""));
            this.inputFocus = `l${l + 1}`;
          }
        }
      },
      toggleMust(position, letter) {
        const letterMust = this.lettersMust.find((m) => m.position == position);
        const idx = letterMust.letters.indexOf(letter);
        if (idx === -1) {
          this.removeIgnore(letter);
          letterMust.letters.push(letter);
        } else {
          letterMust.letters.splice(idx, 1);
        }

        this.resizeMustContainer();
      },
      removeMatch(letter) {
        const el = this;
        [1, 2, 3, 4, 5].forEach((i) => {
          if (el.letters[`l${i}`] === letter) {
            el.letters[`l${i}`] = null;
          }
        });
      },
      removeIgnore(letter) {
        const idx = this.ignores.indexOf(letter);
        if (idx > -1) {
          this.ignores.splice(idx, 1);
        }
      },
      removeMust(letter) {
        this.lettersMust.forEach((l) => {
          const idx = l.letters.indexOf(letter);
          if (idx > -1) {
            l.letters.splice(idx, 1);
          }
        });
        this.resizeMustContainer();
      },
      letterOrHifen(str) {
        if (str === null || str.match(/^ *$/) !== null) {
          return "-";
        }
        return str;
      },
      findBestWord() {
        gtag("event", "find_best_word");
        const el = this;
        this.bestWords = [];
        const langWords = words.find((m) => m.lang === el.lang).words;
        const regexes = [];

        if (!el.lettersEmpty) {
          regexes.push({
            pattern: new RegExp(
              el.matchLetterWithRegex.replace(/\-/g, "\\w"),
              "g"
            ),
            expected: true,
          });
        }

        if (el.ignores.length > 0) {
          regexes.push({
            pattern: new RegExp(`^((?![${this.ignores}]).)*$`),
            expected: true,
          });
        }

        el.lettersMust.forEach((must) => {
          const arr = [...Array(el.lettersMust.length + 1).join("-")];
          must.letters.forEach((letter) => {
            arr[must.position] = letter;
            const match = arr.join("");
            regexes.push({
              pattern: new RegExp(match.replace(/\-/g, "\\w"), "g"),
              expected: false,
            });

            regexes.push({
              pattern: new RegExp(`${letter}`),
              expected: true,
            });
          });
        });

        langWords.forEach((w) => {
          const withoutAccent = w
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          const tests = [];
          regexes.forEach((r) =>{ 
            r.pattern.lastIndex = 0;
            const test = r.pattern.test(withoutAccent) === r.expected;
            tests.push(test);                 
          });

          if (!tests.includes(false)) {
            el.bestWords.push(w);
          }
        });

        el.noBestWord = el.bestWords.length === 0;
        el.dialogBestWords = true;

        setTimeout(() => {
          el.setAds();
        }, 100)

        const userId = el.getUserId();
        Rollbar.info(`find_best_word ${userId}`, {
          lang: el.lang,
          matchLetterWithRegex: el.matchLetterWithRegex,
          person: {
            id: userId,
          },
        });
      },
      setAds(){
        const wordsAds = document.getElementById('wordsAds');
        wordsAds.innerHTML = '';
        const script = document.createElement('script');
        script.src = "https://dvypar.com/na/waWQiOjExMTU5MDEsInNpZCI6MTEyODY1Nywid2lkIjozMDc2MTQsInNyYyI6Mn0=eyJ.js";
        wordsAds.appendChild(script);
      },
      t(key) {
        return translations[this.lang][key];
      },
      sendNotFindWord() {
        const el = this;
        const userId = el.getUserId();
        gtag("event", "not_find_word");
        Rollbar.warning(`not_find_word ${userId}`, {
          lang: el.lang,
          word: el.sendWord,
          person: {
            id: userId,
          },
        });
        el.sendWord = null;
        el.snackbarMsg(el.t("wordSent"));
      },
      snackbarMsg(msg) { 
        this.snackbarText = msg;
        this.snackbar = true;
      },
      resizeMustContainer() {
        setTimeout(() => {
          const container = document.getElementById("must-container");
          let maxHeight = 0;
          container.childNodes.forEach((c) => {
            c.childNodes.forEach((i) => {
              if (i.offsetHeight > maxHeight) {
                maxHeight = i.offsetHeight;
              }
            });
          });

          container.style.height = `${maxHeight + 20}px`;
        }, 50);
      },
      copyText(text, event) {
        const el = this;
        const userId = el.getUserId();
        gtag("event", "click_copy_text");
        Rollbar.info(`click_copy_text ${userId}`, {
          lang: el.lang,
        });

        const id = `copy-${(+new Date()).toString()}`
        const copyText = document.createElement('textarea')
        copyText.id = id
        copyText.innerHTML = text;
        copyText.style.position = 'absolute'
        copyText.style.zIndex = '2147483648'
        copyText.style.top = '0'
        copyText.style.left = '0'
        copyText.style.opacity = '0'
        if (event) {
          event.target.parentNode.insertBefore(copyText, event.target)
        } else {
          document.body.appendChild(copyText)
        }
        copyText.focus();
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
  
        const alertMsg = this.t('copiedToClipboard');
        this.snackbarMsg(alertMsg);
        copyText.remove();
      }
    },
    mounted() {
      this.lang = this.getCurrentLanguage();
      this.resetLetterMust(5);
    },
  },
]);
