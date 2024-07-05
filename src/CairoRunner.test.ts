import { expect, test } from "bun:test";
import runnerInit, { wasm_cairo_run } from "./runner-pkg/cairo_runner.js";
import erc20Sierra from "./erc20-sierra.json";
import smileSierra from "./smile-sierra.json";
import { hashBalance } from "./CairoHash";
import { computeErc20Args } from "./CairoRunner";

const erc20Args = {
    balances: [
        {
            name: "faucet",
            amount: 999999,
        },
        {
            name: "ae0e5100ea7d28905ce690194c0717cd93756a20.ecdsa_secp256r1",
            amount: 1,
        },
    ],
    amount: 1000,
    from: "faucet",
    to: "c59b18d3bdaccb4d689048559a9bb6e8265293bf.ecdsa_secp256r1",
};

const smileArgs =
    "[666 31102 8257 63906 89614 27726 59949 13003 59941 41716 26538 27391 4760 62812 77049 58977 12291 38697 49848 98615 8112 14825 58743 12415 79740 29645 21202 431 98982 48431 48293 17562 68001 95660 15258 61790 8821 78522 52499 62353 39559 34243 72850 92960 17915 50660 23369 44796 43517 26404 16727 97582 50936 21994 43350 86058 56528 91958 89112 99397 4317 83116 57540 48309 45696 76946 11037 82848 46408 75736 54078 69597 86938 22864 33085 2005 54385 67851 97668 53178 71769 14332 98288 6884 98142 92271 42577 86837 38944 85714 79587 83781 77257 57288 43259 18734 93548 59742 40801 65836 1082 23972 18770 29462 92939 13898 34805 91554 79466 66566 85915 57175 67587 61860 71780 34782 33974 63752 2016 43849 54928 53379 78175 32204 6417 21610 91185 97328 6171 4525 69159 30720 69799 79802 89153 32748 15701 76907 97863 81305 27575 19045 41409 89431 35172 78407 47070 40081 87613 21040 31093 3184 93185 10516 33794 78012 91611 33842 70812 36249 37569 18011 14571 29685 81213 25436 1956 11133 8060 57314 95614 20485 80972 30678 37250 59011 52059 15355 78808 89472 71123 85625 10219 28580 54102 99916 63479 54810 50191 24936 65168 99834 46568 59055 89699 92441 24403 87931 34135 54030 791 21087 26040 45879 47087 10270 64712 32352 10618 44920 10846 90141 78004 91921 67205 31574 34351 78443 3241 94718 73624 28818 17786 31874 82856 21362 39479 20503 12885 26248 59913 29784 7816 22912 29557 75272 18160 41547 23550 74832 75687 49920 43414 88782 25698 23501 81127 37280 26115 29483 12733 95586 48888 68244 14874 4815 32319 11582 73741 55798 84263 45487 63790 94389 69686 17067 49502 58524 54679 69716 6938 53606 59268 26282 8240 3933 46246 60720 28680 45295 41781 714 68936 77819 26256 60174 87124 67744 90713 69908 38027 35839 14415 16670 24473 17654 56218 28519 79889 30041 31844 97170 37943 70495 59050 26460 84906 66309 73021 49083 28409 22311 52784 19568 78597 44085 7000 74400 86810 24162 69632 18136 86255 21186 25942 12517 56041 86188 93065 10654 4785 4120 57867 83909 34023 90100 1373 79928 59528 94180 66109 526 5188 25926 18334 50253 25099 82329 20548 51350 13678 81306 25902 12640 73246 49253 31928 94028 59686 93829 7629 13508 56824 82793 56645 8582 26139 33686 25594 8860 88217 90624 61245 9053 45131 36788 69004 9449 36856 84530 4888 66017 42596 14547 37563 27230 41445 90717 51372 22276 6360 47850 69525 36637 4370 65485 23225 43013 30630 57970 53404 62958 51411 28395 6202 86515 11834 22626 81244 89689 78762 66741 95201 22320 25715 99414 28635 55493 9 27251 20157 19495 58763 56538 15798 9504 6697 55028 70308 3118 1684 20722 94458 79719 79969 23093 53455 5146 22498 22554 83711 81913 10835 93947 75847 62549 58224 13744 92363 9544 39855 44805 22758 96676 22079 76259 48531 41889 7676 66704 55069 38549 52098 3242 18979 74059 95738 14266 15373 528 91285 80929 9988 77170 68715 48201 40603 10239 77216 88005 30068 89523 24326 40370 16386 44810 79313 73555 95222 21939 45347 69593 81331 57184 32422 94965 57047 52494 95197 82598 75508 79272 17507 62284 48313 25066 85162 96986 51383 7028 90773 39607 81593 62578 90977 71621 26284 28592 21043 80968 90719 91351 99413 60953 88651 54066 23417 57017 30634 62824 10757 29920 42296 77091 76794 42921 38050 27415 8601 15334 73875 3038 84505 9294 98720 15045 24989 79134 77974 75628 36684 39145 30232 69129 4265 48070 4600 56241 74368 34045 66835 96781 75833 67561 20901 5441 73221 92631 31065 45038 65361 8784 6655 92571 84099 20505 66508 62982 70293 35513 36772 57591 33274 35775 1754 4318 88782 28501 14672 3620 39525 96682 39894 93613 51022 4764 24744 13812 56038 19042 2982 28458 43789 15917 69347 69124 38714 22857 37266 11749 38855 73122 49016 67391 89039 78462 33549 86347 83674 96701 41536 38287 73714 4371 39450 82474 52888 87224 74748 46554 48058 36213 46900 32587 86870 71949 53312 63594 8691 64016 60684 88759 5679 85306 69590 85702 97922 91311 45211 14691 17251 97727 95886 76846 76022 18987 73450 87077 96188 7116 29530 27581 11214 92972 42961 21887 96383 46478 42936 66846 82666 5168 22368 22021 9254 99879 37154 86141 96125 68881 3818 17211 97921 5337 71482 12558 11501 3611 82231 66773 96807 36964 35219 44998 82332 25576 74833 19525 6755 19130 32003 36889 89753 1945 88829 50074 73788 22245 34433 36732 20549 15710 76075 56880 80126 3300 76843 75017 26947 77005 31261 75706 92510 45175 17521 79622 21569 12427 8065 14094 10647 25884 72100 76363 68271 81520 42 61423 39315 38901 57492 98180 65869 80341 93606 41014 86407 84801 28205 69890 37046 41346 9533 2036 12939 38410 11641 35360 21684 22837 81528 77768 68518 99121 39632 28312 41434 87611 93244 31402 16842 37123 19759 68790 30056 16301 82108 59605 21391 78987 59780 85711 30009 57334 77218 91104 9048 67783 83324 30385 85773 40042 60466 71954 13660 96733 76430 84535 16783 29873 8350 85589 43963 22798 84063 24416 56512 83019 46708 21248 11050 83497 43648 81274 81728 49686 6326 72398 37508 2005 75263 92076 16420 84208 53834 39532 50465 28362 11302 40536 25146 29975 96611 6387 84473 71247 86045 14939 46100 12493 10103 83056 10642 51676 35673 15894 7477 86394 51055 18781 51142 49817 86499 8164 38268 98509 28960 72078 54230 39766 35521 44137 12481 16841 94895 87463 93747 58129 13864 83548 24775 15509 19609 43020 44771 73606 71432 35067 37606 53391 2333 76310 72363 31564 32906 38495 54561 79088 99904 95807 10015 13902 71347 70796 50137 99043 17842 45814 63761 50069 82938 15 17659 37145 9721 40989 68946 67876 99603 33553 40770 35207 44021 52363 23008 44060 16133 42183 29808 61706 44830 90533 79838 70694 5111 71639 75892 54065 61980 67565 55104 57166 38487 71159 79033 86549 18705 1460 16568 18954 45408 95513 27151 70028 4280 42358 34959 56885 97983 49434 23647 76286 47760 51982 62729 38401 17181 45673 97545 69831 33550 11983 57527 13192 53279 43826 60856 86692 71149 48852 65234 71402 55481 48317 38585 68472 16239 21969 14522 48691 91817 99433 24675 32977 85692 76116 1985 66682 23946 68985 25579 35920 56064 28195 58524 933 31103 8552 95606 53700 74352 98355 77790 80651 59394 82919 69505 74604 59545 45287 89631 77346 70345 3657 36856 12967 51661 89778 28304 81765 13836 55010 66641 49480 92210 13359 90151 12534 61351 78356 73596 14571 13226 61109 89673 51738 39540 83055 24841 9427 62887 90624 93279 93412 40314 92857 47846 29363 8572 82207 77532 57082 89924 22345 89340 49215 76888 36111 33513 98720 38729 86126 83838 82114 57395 32468 44402 34628 37692 67859 42363 87833 91697 58639 46333 73339 11281 71362 62502 96559 16587 70508 78427 25303 24376 83220 48549 10883 46848 93105 86621 48305 98142 1910 9976 46094 35766 11803 78235 55674 2623 40731 53881 83375 74658 73716 5294 97281 84434 69890 89959 26798 99468 31686 23504 2842 43234 20083 60243 95072 83721 89987 25419 52752 31318 66888 28849 30063 12352 18895 27345 93025 87784 13005 25916 15890 91908 26013 28929 72867 28901 76357 6806 68372 97322 2009 17577 38231 68629 67474 81706 76940 82059 4835 34641 20947 23758 69285 58074 17082 43728 21635 41298 49748 35547 58321 22430 12294 64145 69053 5225 26573 59145 7702 11028 9362 52560 67802 14245 75837 5162 65676 54206 60414 72348 58793 8846 80125 95814 26235 66779 27222 96511 5787 8336 35826 5638 97513 62822 52666 51817 25044 29298 97780 86195 10852 40473 15181 59130 27086 36701 40806 36801 4754 23504 18988 79207 8892 79524 94786 96571 60516 72950 61053 4206 32405 33880 12588 86212 11984 32025 81548 47008 22459 97919 17241 88857 27875 89950 50821 78307 19103 29965 193 8043 41013 44190 75526 31991 85232 80574 1394 14318 47751 13492 57106 38632 81912 76647 57347 81543 5865 79034 46323 75702 92107 64442 91782 80447 12910 94547 7777 70060 3823 72709 84933 77770 59688 155 89602 67412 86535 65664 73235 24354 9918 10083 90548 5824 85931 97211 1009 59790 89819 21701 9078 99151 18327 7683 11565 81777 15067 98511 83709 28563 23030 1784 1340 59588 12688 57706 80003 22348 52768 48089 46595 66658 85261 25227 85098 38696 30059 85542 47080 36303 28559 98444 13210 37508 93989 73931 14364 13617 30523 52863 24062 39088 60121 5626 55985 32688 48652 90469 26206 99147 45817 90743 8521 163 32607 17681 70399 60226 50209 25128 89333 85299 2317 44643 52728 45023 40855 86837 21949 61542 50021 18340 3862 20583 25259 58736 38573 4099 31184 20481 84598 70754 46111 90109 12758 36964 22793 83462 31806 99285 70922 95248 51338 77703 62431 64862 25494 2466 93529 37463 48482 59193 12850 33630 700 95985 99850 83576 9498 82840 39129 72691 68537 96754 6239 17287 62987 14053 5330 84244 41526 96374 18180 68951 45717 17371 18572 5286 1809 4414 24232 27572 1225 23475 28869 25201 47840 22962 91335 22767 75880 22879 5304 21859 33813 81801 99864 92249 59955 41597 37097 6241 48440 15112 42716 66981 47563 45954 84313 26861 33302 69461 27799 39176 30316 25569 89992 15520 51618 56158 23300 78221 30808 92664 32026 5411 92455 10841 70937 40170 62309 80921 59312 72932 21349 1566 75879 20814 85869 580 81431 2901 42966 17216 93502 37514 47327 21265 50034 41108 5204 7893 23077 55820 21118 10159 54293 59332 80073 70837 60938 65918 91035 80327 65905 52698 20644 76649 25232 4885 58991 55021 77793 93185 43358 23819 37397 88644 22604 15957 79557 54841 66170 31154 83983 5337 43963 19654 23502 80130 48560 77844 72018 17548 89517 61404 78531 93612 31043 95035 19447 98586 84678 96269 29149 88256 52998 68205 90312 71805 39486 82983 63534 27961 40644 64941 50026 19777 37063 46889 82502 28757 18593 32462 23674 70259 89121 44682 45311 78514 9656 73390 62640 14573 4544 96267 64791 86575 80518 16360 3816 44895 8295 15755 74157 37109 72355 26762 1457 50727 60696 2214 27657 66527 91991 16130 70789 92562 86287 80313 31056 46805 71718 76266 58072 93507 65754 52253 9987 45011 3558 14513 87059 31592 45213 79104 95102 96895 26010 55162 11131 47406 56749 73059 94035 5100 36841 95568 84696 90851 22060 56088 42313 67520 9992 67128 53209 2136 34269 13458 62262 93639 92332 8102 8812 1312 14147 21438 25628 54700 14962 51890 27598 76445 75740 86765 89486 75360 69832 93908 18240 58515 38571 64726 82829 42519 85714 82655 68262 49457 85932 23341 70177 56704 92259 42490 8432 61971 88322 53364 663 24108 47970 46788 72464 36634 54355 44340 31352 56780 45233 66345 65759 32801 70773 85554 15705 31432 29347 88359 89572 78662 79144 49441 12324 16084 49462 49597 79742 56192 97647 63725 6526 96164 11030 28442 61360 43319 81619 63685 2241 37865 41017 50173 10192 24538 24974 46155 23872 53213 80863 49455 63996 43944 6619 60620 50804 53501 26173 29020 42239 63820 13512 45818 62113 11131 56797 19510 62052 94511 39235 8984 37430 77743 78050 94686 96395 36661 31282 17596 99184 5688 79686 56236 23740 18262 8498 49599 59177 27226 51836 54645 49735 14016 58693 88771 19190 57356 15554 19881 23596 81233 29480 11569 8269 27690 26544 9808 33902 30836 72518 56222 13230 29736 51301 45885 6433 6195 11511 77283 80002 42512 38723 28275 73981 13802 78288 99601 80662 10224 44400 60775 95333 75873 99852 39682 27677 27704 38158 39400 87158 73460 22490 64130 87144 11842 99292 88186 6435 31915 19280 56431 90150 23119 10689 52624 76823 65162 51918 99951 13962 64761 29394 12063 87115 48470 65931 67158 20503 75369 88637 9695 42454 32665 63185 55008 92092 19539 3135 55659 41512 5920 61063 92211 58804 60683 55553 97874 94592 72640 83050 89452 70196 86108 48978 21647 55673 91909 54295 28966 74203 57218 82698 47104 38135 63544 36410 78882 38256 20517 43634 11389 51235 97910 72900 12359 36178 62599 40866 28674 74202 74848 65114 11577 40973 34789 58602 90426 59944 43754 99632 88805 51786 755 67082 48889 74110 36555 76134 51240 4113 55300 67093 69883 26980 6834 3913 29438 75461 40692 47984 89367 32079 5740 49992 64478 65350 31770 20682 58686 93129 21647 1479 21145 13612 88193 86398 95856 76143 48800 30806 69409 44601 89119 77604 62056 81607 48638 24735 55647 16264 54139 56002 91338 97292 85287 33577 93846 91217 7092 93847 69749 50906 27439 68880 77401 77125 77239 59252 46993 16562 7479 39427 97141 18671 3522 89771 47128 5399 20573 58384 36838 47969 63712 1977 65210 59920 98628 10199 91355 79428 54714 65253 10971 27425 82228 84029 74079 97444 83123 44785 38178 78765 12945 7714 46872 22764 33 36111 17099 66313 57181 75039 86892 91556 22185 1910 20291 31302 84106 44966 17302 71121 69102 97170 68112 23561 14159 47836 12937 41031 33908 15616 99031 88647 77361 56769 54448 18650 85578 11330 89301 46498 12974 33465 10029 58875 37095 65236 40734 68455 74112 35724 24561 54939 24482 72311 3603 23007 92191 71786 4856 34970 81294 58282 41029 30423 21350 69774 71742 41014 3197 84178 11477 39545 79706 71510 32065 21212 20226 65929 67620 8695 39459 96308 85250 62280 29089 39596 19918 86732 35397 59304 85155 66709 80452 57458 95256 63265 54289 75497 32489 82608 85204 32339 73293 14652 94208 56352 27924 16687 45972 12259 99823 598 29929 40461 96746 22203 4526 58664 14029 76957 23042 25610 46382 78748 52277 52627 54677 79402 50062 34010 83472 56353 54035 8746 49837 52207 66619 58914 38384 19023 26703 35366 68619 9451 82472 82692 73983 78119 70166 65007 57680 95832 65622 18986 6398 90257 75917 42736 69416 77805 39200 90074 14754 39720 45003 19976 78310 89174 58776 75713 43027 71693 14467 21105 67743 73672 73713 93128 20475 68250 72901 81800 96311 39093 83953 5190 56737 25960 13088 49401 51629 19083 35955 94510 49104 79472 3089 2420 18576 31208 98657 17439 44634 43855 28987 828 99484 35335 61141 89473 70135 16142 76574 42114 42783 26391 3263 41015 59162 47481 99039 57484 31279 18808 73804 50283 60590 60305 76905 3631 48616 42131 48811 88463 88438 45744 44234 78428 26997 16591 86519 40306 99649 3771 77 82826 24248 83585 22687 87976 85799 44634 41548 53820 80334 49429 55636 63587 45252 32155 1887 95832 38979 35155 13211 88494 78229 8824 74141 39039 94397 5154 89350 63126 85633 40850 25687 52496 18668 95349 53661 88111 84164 31513 7627 45882 34490]";

test("hashBalanceGenesisState", () => {
    expect(hashBalance([{ name: "faucet", amount: 1000000 }])).toEqual(
        "712283419138572991963600362117880041447189344350653266109245321471516704496",
    );
});

test("hashBalanceWithShortNames", () => {
    expect(
        hashBalance([
            { name: "bob", amount: 100 },
            { name: "alice", amount: 0 },
        ]),
    ).toEqual("2553248914692030785942303172119107100577416932040888712016243391667211221779");
});

test("hashBalanceWithLongNames", () => {
    expect(
        hashBalance([
            { name: "faucet", amount: 999999 },
            { name: "ea52d6459ddcb891e08001321246dbc7bdcd9d01.ecdsa_secp256r1", amount: 1 },
        ]),
    ).toEqual("802132474092543607147321308332300047661392663766327111661533130755281240521");
});

test("parse cairo args", () => {
    expect(
        computeErc20Args({
            balances: [
                { name: "bob", amount: 100 },
                { name: "alice", amount: 0 },
            ],
            amount: 99,
            from: "bob",
            to: "max",
        }),
    ).toEqual(
        "[2 0 6451042 3 100 0 418430673765 5 0 99 0 6451042 3 0 7168376 3 2553248914692030785942303172119107100577416932040888712016243391667211221779]",
        //      bob              alice              from(bob)    to(max)                          initial state
    );
});

test("CairoERC20Runner", async () => {
    await runnerInit();
    const args = computeErc20Args(erc20Args);
    expect(args).toEqual(
        "[2 0 112568767309172 6 999999 1 172082546400392586503321564013315443437272069642000178486097778721139275619 629112714957187370486706980944031096940330347162406298743345 25 1 1000 0 112568767309172 6 1 175285199027252607942330356499331179285261039416457052358062226228862137957 352748885689853111792340362419153546690909839254974950175281 25 2831912719953807781384198442703907171559331656188090552995826225667240275554]",
    );
    const { trace, memory, output } = wasm_cairo_run(JSON.stringify(erc20Sierra), args);
    expect(trace.length).toEqual(3145728);
    expect(memory.length).toEqual(240400);
    expect(output).toEqual(
        "[1 2831912719953807781384198442703907171559331656188090552995826225667240275554 821437474560069410818607312792617211384461751521236926274368999079072185639 1 175285199027252607942330356499331179285261039416457052358062226228862137957 352748885689853111792340362419153546690909839254974950175281 25 0 0 112568767309172 6 1 175285199027252607942330356499331179285261039416457052358062226228862137957 352748885689853111792340362419153546690909839254974950175281 25 1000]",
    );
});

import proverInit, { wasm_prove } from "./prover-pkg/cairo_verifier.js";
test("CairoSmileRunner", async () => {
    await runnerInit();
    const { trace, memory, output } = wasm_cairo_run(JSON.stringify(smileSierra), smileArgs);
    expect(trace.length).toEqual(6291456);
    expect(memory.length).toEqual(5777760);
    expect(output).toEqual("[1 31102 31102 0 0 0 0 0 0 0 134279]");
    await proverInit();
    // wasm_prove(new Uint8Array(trace), new Uint8Array(memory), output);
});
