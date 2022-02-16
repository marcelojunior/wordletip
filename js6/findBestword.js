mixins = mixins.concat([
  {
    data() {
      return {
        types: {
          LetterEmpty: 0,
          LetterCorrect: 1,
          LetterMust: 2,
          LetterIgnore: 3,
        },
        breakeKeyboard: ["p", "l"],
        bestWords: [],
        lang: "pt",
        inputFocus: {
          concat: 01,
          attempt: 0,
          position: 0,
        },
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
        attempts: [],
        lettersCount: 5,
        keyboardType: 1,
      };
    },
    computed: {
      keyboard() {
        return "q,w,e,r,t,y,u,i,o,p,a,s,d,f,g,h,j,k,l,z,x,c,v,b,n,m".split(",");
      },
      keyboardSelectColor() {
        if (this.keyboardType == this.types.LetterCorrect) {
          return "#00695c";
        } else if (this.keyboardType == this.types.LetterMust) {
          return "#ff8f00";
        } else if (this.keyboardType == this.types.LetterIgnore) {
          return "#e53935";
        }
      },
      keyboardSelectText() {
        if (this.keyboardType == this.types.LetterCorrect) {
          return this.t("letterCorrect");
        } else if (this.keyboardType == this.types.LetterMust) {
          return this.t("letterMust");
        } else if (this.keyboardType == this.types.LetterIgnore) {
          return this.t("letterIgnore");
        }
      },
      allCorrectLetters(){
        const el = this;
        return el.attempts.map(m => m.letters.filter(mf => mf.type === el.types.LetterCorrect).map(l => l.letter).filter(f => f)).flat()
      },
      allMustLetters(){
        const el = this;
        return el.attempts.map(m => m.letters.filter(mf => mf.type === el.types.LetterMust).map(l => l.letter).filter(f => f)).flat()
      },
      allIgnoreLetters(){
        const el = this;
        return el.attempts.map(m => m.letters.filter(mf => mf.type === el.types.LetterIgnore).map(l => l.letter).filter(f => f)).flat()
      },
    },
    methods: {
      addAttempt() {
        const el = this;
        const letters = [];
        for (let i = 0; i < el.lettersCount; i++) {
          letters.push({
            position: i,
            letter: null,
            type: el.types.LetterEmpty,
          });
        }

        el.attempts.push({
          attempt: el.attempts.length,
          letters: letters,
        });
        el.setFocus(el.attempts.length - 1, 0);
      },
      clear() {
        this.attempts = [];
        this.addAttempt();
      },
      getCurrentPosition() {
        const attempt = this.getCurrentAttempt();
        const position = attempt.letters.find(
          (m) => m.position === this.inputFocus.position
        );
        return position;
      },
      getCurrentAttempt() {
        return this.attempts[this.inputFocus.attempt];
      },
      isAttemptCorrect(attemptIndex){
        if (attemptIndex < 0){
          return false;
        }

        if (!this.attempts[attemptIndex]){
          return false;
        }

        return this.attempts[attemptIndex].letters.filter(m => m.type === this.types.LetterCorrect).length === this.lettersCount;
      },
      someEmpty(attemptIndex){
        if (attemptIndex < 0){
          return false;
        }

        if (!this.attempts[attemptIndex]){
          return false;
        }

        return this.attempts[attemptIndex].letters.filter(m => m.type === this.types.LetterEmpty).length > 0;
      },
      backspace() {
        const attempt = this.getCurrentAttempt();
        const position = this.getCurrentPosition();
        if (position.letter) {
          position.letter = null;
          position.type = this.types.LetterEmpty;
        } else {
          position.type = this.types.LetterEmpty;
          if (position.position === 0) {
            if (attempt.attempt > 0) {
              this.setFocus(attempt.attempt - 1, attempt.letters.length - 1);
              this.attempts.splice(attempt.attempt, 1);
            }
          } else {
            this.setFocus(attempt.attempt, position.position - 1);
          }
        }
      },
      setFocus(attempt, position) {
        this.inputFocus.concat = `${attempt}${position}`;
        this.inputFocus.attempt = attempt;
        this.inputFocus.position = position;        
      },
      toggleType(type) {
        const position = this.getCurrentPosition();
        position.type = type;
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
      keyboardSetType(type) {
        this.keyboardType = type;
        const position = this.getCurrentPosition();
        position.type = this.keyboardType;
      },
      toggleKeyboard(letter) {
        const position = this.getCurrentPosition();
        position.letter = letter;
        position.type = this.keyboardType;
        if (this.inputFocus.position < this.lettersCount - 1) {
          this.setFocus(this.inputFocus.attempt, this.inputFocus.position + 1);
        } else {
          this.addAttempt();
        }

        // Se a posição superior for correta, já preeche
        if (this.inputFocus.attempt > 0 && !this.isAttemptCorrect(this.inputFocus.attempt -1)){
          const lastAttempt = this.attempts[this.inputFocus.attempt -1];
          const lastPosition = lastAttempt.letters.find(m => m.position == this.inputFocus.position);
          if (lastPosition.type === this.types.LetterCorrect){
            const tmpKeyboardType = this.keyboardType;
            this.keyboardSetType(this.types.LetterCorrect);
            this.toggleKeyboard(lastPosition.letter) 
            this.keyboardSetType(tmpKeyboardType); 
          }
        }
      },
      addRegex(regexes, attempt, title, expected, type, completeWithW) {
        const el = this;
        const letters = [];
        if (!attempt.letters.some((m) => m.type === type)) {
          return;
        }

        attempt.letters.forEach((letter) => {
          if (letter.type === type) {
            if (letter.letter) {
              letters.push(letter.letter);
            } else {
              letters.push("\\w");
            }
          } else if (completeWithW) {
            letters.push("\\w");
          }
        });

        regexes.push({
          title: title,
          pattern: new RegExp(letters.join(""), "g"),
          expected: expected,
        });
      },
      findBestWord() {
        gtag("event", "find_best_word");
        const el = this;
        this.bestWords = [];
        const langWords = words.find((m) => m.lang === el.lang).words;
        const regexes = [];

        el.attempts.forEach((attempt) => {
          el.addRegex(
            regexes,
            attempt,
            "emptyLetters",
            true,
            el.types.LetterEmpty,
            false
          );
          el.addRegex(
            regexes,
            attempt,
            "correctLetters",
            true,
            el.types.LetterCorrect,
            true
          );
          el.addRegex(
            regexes,
            attempt,
            "inTheWord",
            true,
            el.types.LetterMust,
            false
          );
          el.addRegex(
            regexes,
            attempt,
            "inTheWordSpot",
            false,
            el.types.LetterMust,
            true
          );
          el.addRegex(
            regexes,
            attempt,
            "ignoreWords",
            false,
            el.types.LetterIgnore,
            true
          );
        });

        const ignoreLetters = []
        el.allIgnoreLetters.forEach(ig => {
          if (!el.allCorrectLetters.includes(ig) && !el.allMustLetters.includes(ig)){
            ignoreLetters.push(ig);
          }
        })
        if (ignoreLetters.length > 0){
          regexes.push({
            title: 'ignoreAllLetters',
            pattern: new RegExp(`^((?![${ignoreLetters.join('')}]).)*$`),
            expected: true,
          });
        }


        langWords.forEach((w) => {
          const withoutAccent = w
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          const tests = [];
          regexes.forEach((r) => {
            r.pattern.lastIndex = 0;
            const test = r.pattern.test(withoutAccent);
            const compare = test === r.expected;
            tests.push(compare);
          });

          if (!tests.includes(false)) {
            el.bestWords.push(w);
          }
        });

        el.noBestWord = el.bestWords.length === 0;
        el.dialogBestWords = true;

        setTimeout(() => {
          el.setAds();
        }, 100);

        const userId = el.getUserId();
        Rollbar.info(`find_best_word ${userId}`, {
          lang: el.lang,
          matchLetterWithRegex: el.matchLetterWithRegex,
          person: {
            id: userId,
          },
        });
      },
      setAds() {
        // const wordsAds = document.getElementById("wordsAds");
        // wordsAds.innerHTML = "";
        // const script = document.createElement("script");
        // script.src =
        //   "https://dvypar.com/na/waWQiOjExMTU5MDEsInNpZCI6MTEyODY1Nywid2lkIjozMDc2MTQsInNyYyI6Mn0=eyJ.js";
        // wordsAds.appendChild(script);
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

      copyText(text, event) {
        const el = this;
        const userId = el.getUserId();
        gtag("event", "click_copy_text");
        Rollbar.info(`click_copy_text ${userId}`, {
          lang: el.lang,
        });

        const id = `copy-${(+new Date()).toString()}`;
        const copyText = document.createElement("textarea");
        copyText.id = id;
        copyText.innerHTML = text;
        copyText.style.position = "absolute";
        copyText.style.zIndex = "2147483648";
        copyText.style.top = "0";
        copyText.style.left = "0";
        copyText.style.opacity = "0";
        if (event) {
          event.target.parentNode.insertBefore(copyText, event.target);
        } else {
          document.body.appendChild(copyText);
        }
        copyText.focus();
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");

        const alertMsg = this.t("copiedToClipboard");
        this.snackbarMsg(alertMsg);
        copyText.remove();
      },
    },
    mounted() {
      this.lang = this.getCurrentLanguage();
      this.clear();
    },
  },
]);
