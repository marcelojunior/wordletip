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
        must: [],
        breakeKeyboard: ["p", "l"],
        bestWords: [],
        lang: "pt",
        inputFocus: "l1",
        noBestWord: false,
        languages: [{value: 'pt', text: 'Português'}, {value: 'en', text: 'English'}]
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
      disableSearch(){
          return (this.lettersEmpty && this.must.length === 0 && this.ignores.length === 0)
      }
    },
    methods: {
        getCurrentLanguage(){
        return (navigator.language || navigator.userLanguage).toLowerCase();
        },
      clear() {
        this.letters.l1 = null;
        this.letters.l2 = null;
        this.letters.l3 = null;
        this.letters.l4 = null;
        this.letters.l5 = null;
        this.ignores = [];
        this.must = [];
      },
      toggleIgnore(letter) {
        if (this.inputFocus == "ignore") {
          const idx = this.ignores.indexOf(letter);
          if (idx > -1) {
            this.ignores.splice(idx, 1);
          } else {
            this.ignores.push(letter);
            this.removeMust(letter);
            this.removeMatch(letter);
          }
        } else if (this.inputFocus == "must") {
          const idx = this.must.indexOf(letter);
          if (idx > -1) {
            this.must.splice(idx, 1);
          } else {
            this.must.push(letter);
            this.removeIgnore(letter);
            this.removeMatch(letter);
          }
        } else {
          this.removeIgnore(letter);
          this.removeMust(letter);
          if (this.letters[this.inputFocus] == letter) {
            this.letters[this.inputFocus] = null;
          } else {
            this.letters[this.inputFocus] = letter;
          }

          if(this.inputFocus !== 'l5'){
            const l = parseInt(this.inputFocus.replace('l', ''));
            this.inputFocus = `l${l+1}`
          }
        }
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
        const idx = this.must.indexOf(letter);
        if (idx > -1) {
          this.must.splice(idx, 1);
        }
      },
      letterOrHifen(str) {
        if (str === null || str.match(/^ *$/) !== null) {
          return "-";
        }
        return str;
      },
      findBesWord() {
        const el = this;
        this.bestWords = [];
        const regMatch = new RegExp(
          el.matchLetterWithRegex.replace(/\-/g, "\\w"),
          "g"
        );
        const regIgnore = new RegExp(`^((?![${this.ignores}]).)*$`);
        const regMust = new RegExp(`[${this.must}]`)
        const langWords = words.find((m) => m.lang === el.lang).words;

        langWords.forEach((w) => {
          const withoutAccent = w
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          if ((regMatch.test(withoutAccent)|| el.lettersEmpty) && 
          (regIgnore.test(withoutAccent) || el.ignores.length === 0) && 
          (regMust.test(withoutAccent) || el.must.length === 0)) {
            el.bestWords.push(w);
          }
        });

        el.noBestWord = el.bestWords.length === 0;
      },
      t(key){
        return translations[this.lang][key];
      }
    },
    mounted() {
        this.lang = this.getCurrentLanguage().split('-')[0];
    }
  },
]);
