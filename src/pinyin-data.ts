export type VoiceGender = 'male' | 'female';

export interface ToneCombo {
    id: string;
    pinyin: string;
    meaning: string;
    tones: string;
}

export interface ToneGroup {
    label: string;
    combos: ToneCombo[];
}

export const TONE_GROUPS: ToneGroup[] = [
    {
        label: '1st Tone Pairs',
        combos: [
            { id: 'fei1ji1', pinyin: 'fēijī', meaning: 'airplane', tones: '1+1' },
            { id: 'zhong1guo2', pinyin: 'zhōngguó', meaning: 'China', tones: '1+2' },
            { id: 'zhong1wu3', pinyin: 'zhōngwǔ', meaning: 'noon', tones: '1+3' },
            { id: 'gao1xing4', pinyin: 'gāoxìng', meaning: 'happy', tones: '1+4' },
            { id: 'bei1zi0', pinyin: 'bēizi', meaning: 'cup', tones: '1+0' },
        ],
    },
    {
        label: '2nd Tone Pairs',
        combos: [
            { id: 'ming2tian1', pinyin: 'míngtiān', meaning: 'tomorrow', tones: '2+1' },
            { id: 'tong2xue2', pinyin: 'tóngxué', meaning: 'classmate', tones: '2+2' },
            { id: 'mei2you3', pinyin: 'méiyǒu', meaning: 'not have', tones: '2+3' },
            { id: 'qian2mian4', pinyin: 'qiánmiàn', meaning: 'in front', tones: '2+4' },
            { id: 'er2zi0', pinyin: 'érzi', meaning: 'son', tones: '2+0' },
        ],
    },
    {
        label: '3rd Tone Pairs',
        combos: [
            { id: 'bei3jing1', pinyin: 'běijīng', meaning: 'Beijing', tones: '3+1' },
            { id: 'nv3er2', pinyin: 'nǚér', meaning: 'daughter', tones: '3+2' },
            { id: 'shui3guo3', pinyin: 'shuǐguǒ', meaning: 'fruit', tones: '3+3' },
            { id: 'mi3fan4', pinyin: 'mǐfàn', meaning: 'rice', tones: '3+4' },
            { id: 'wo3men0', pinyin: 'wǒmen', meaning: 'we; us', tones: '3+0' },
        ],
    },
    {
        label: '4th Tone Pairs',
        combos: [
            { id: 'chang4ge1', pinyin: 'chànggē', meaning: 'sing', tones: '4+1' },
            { id: 'mian4tiao2', pinyin: 'miàntiáo', meaning: 'noodles', tones: '4+2' },
            { id: 'dian4nao3', pinyin: 'diànnǎo', meaning: 'computer', tones: '4+3' },
            { id: 'dian4shi4', pinyin: 'diànshì', meaning: 'TV', tones: '4+4' },
            { id: 'ba4ba0', pinyin: 'bàba', meaning: 'dad', tones: '4+0' },
        ],
    },
];

// All pinyin syllables available (409 from female set, 392 from male set)
export const PINYIN_SYLLABLES: string[] = [
    'a', 'ai', 'an', 'ang', 'ao',
    'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian', 'biao', 'bie', 'bin', 'bing', 'bo', 'bu',
    'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chi', 'chong', 'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo', 'ci', 'cong', 'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',
    'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'den', 'deng', 'di', 'dian', 'diang', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun', 'duo',
    'e', 'ei', 'en', 'er',
    'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',
    'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
    'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong', 'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
    'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'ju', 'juan', 'jue', 'jun',
    'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou', 'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
    'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'lo', 'long', 'lou', 'lu', 'luan', 'lun', 'luo', 'lv', 'lve',
    'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian', 'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',
    'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nia', 'nian', 'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nuan', 'nun', 'nuo', 'nv', 'nve',
    'ou',
    'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian', 'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',
    'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu', 'qu', 'quan', 'que', 'qun',
    'ran', 'rang', 'rao', 're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo',
    'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sei', 'sen', 'seng', 'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shi', 'shong', 'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo', 'si', 'song', 'sou', 'su', 'suan', 'sui', 'sun', 'suo',
    'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao', 'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',
    'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',
    'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu', 'xu', 'xuan', 'xue', 'xun',
    'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yong', 'you', 'yu', 'yuan', 'yue', 'yun',
    'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhi', 'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo', 'zi', 'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',
];

export const DEFAULT_SYLLABLE = 'ma';
export const DEFAULT_GENDER: VoiceGender = 'female';
