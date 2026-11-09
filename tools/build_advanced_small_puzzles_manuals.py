#!/usr/bin/env python3
"""Build verified Japanese case atlases for three small puzzles."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable, HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parent.parent
PORTFOLIO = ROOT.parent / "Python" / "Rubiks_portfolio"
sys.path.insert(0, str(PORTFOLIO))
from cube.rubiks_cube import Rubiks_3
from core.cube_constants import R_Nums
from pyraminx.cube import PyraminxCube
from skewb.cube import SkewbCube

FONT_PATH = next(
    path for path in (
        Path("/Applications/Wondershare Filmora Mac.app/Contents/Resources/Fonts/MPLUS1p-Regular.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    ) if path.exists()
)
pdfmetrics.registerFont(TTFont("MPlus1p", str(FONT_PATH)))
FONT = "MPlus1p"
NAVY = colors.HexColor("#13243b")
BLUE = colors.HexColor("#205b89")
TEAL = colors.HexColor("#167c78")
PALE = colors.HexColor("#f3f7f9")
TEXT = colors.HexColor("#203040")
MUTED = colors.HexColor("#536579")
LINE = colors.HexColor("#d7e1e7")

STYLES = {
    "title": ParagraphStyle("title", fontName=FONT, fontSize=24, leading=31, textColor=NAVY, spaceAfter=14),
    "subtitle": ParagraphStyle("subtitle", fontName=FONT, fontSize=11, leading=18, textColor=MUTED, spaceAfter=18),
    "h1": ParagraphStyle("h1", fontName=FONT, fontSize=15, leading=23, textColor=NAVY, spaceBefore=16, spaceAfter=9),
    "h2": ParagraphStyle("h2", fontName=FONT, fontSize=11, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=5),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=9.1, leading=15, textColor=TEXT, spaceAfter=8, wordWrap="CJK"),
    "small": ParagraphStyle("small", fontName=FONT, fontSize=7.7, leading=12, textColor=TEXT, spaceAfter=4, wordWrap="CJK"),
    "tiny": ParagraphStyle("tiny", fontName=FONT, fontSize=6.8, leading=10, textColor=MUTED, spaceAfter=3, wordWrap="CJK"),
    "case": ParagraphStyle("case", fontName=FONT, fontSize=11, leading=16, textColor=NAVY, spaceAfter=5),
    "alg": ParagraphStyle("alg", fontName="Courier", fontSize=8.2, leading=11.5, textColor=BLUE, spaceAfter=5),
}

def P(s, style="body"):
    return Paragraph(s, STYLES[style])

def title(story, heading, subtitle):
    story += [Spacer(1, 24), P(heading, "title"), P(subtitle, "subtitle"), HRFlowable(width="100%", color=TEAL, thickness=2), Spacer(1, 18)]

def section(story, heading, body=None):
    story.append(P(heading, "h1"))
    if body:
        story.append(P(body))

def footer(canvas, doc, label):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(40, 35, w-40, 35)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(40, 22, label)
    canvas.drawRightString(w-40, 22, f"{doc.page:02d}")
    canvas.restoreState()

COLORS_2 = {"R":"#df4747","O":"#ee9e3c","Y":"#f1d34a","W":"#f8f9f8","G":"#49a76d","B":"#417ab6"}
COLORS_P = {"U":"#f4dd55","L":"#4aae73","R":"#df5855","B":"#477fc2"}
COLORS_S = {"U":"#f8f8f6","D":"#efcf4d","F":"#49a96e","B":"#477fc2","L":"#ea9a3b","R":"#df5550"}

def set_fill(canvas, color):
    canvas.setFillColor(colors.HexColor(color))
    canvas.setStrokeColor(colors.HexColor("#8a98a4"))

def cube_face_coords(face, index):
    """Return net face position and sticker row/column as in portfolio StateViewer."""
    face_number={"U":0,"D":1,"F":2,"B":3,"L":4,"R":5}[face]
    rank=sorted(range(4),key=lambda k:int(R_Nums[2].reshape(-1)[k]))[index]
    row=rank//2+1
    col=rank%2+1
    stride=3
    raw_rows=[stride+row,2*stride-row,3*stride-row,row,2*stride-col,stride+col]
    raw_cols=[stride+col,4*stride-col,2*stride-col,stride+col,row,3*stride-row]
    raw_row,raw_col=raw_rows[face_number],raw_cols[face_number]
    return (raw_col-1)//3,(raw_row-1)//3,(raw_col-1)%3,(raw_row-1)%3

def face_label(canvas, text, x, y, background=True, text_color=NAVY):
    if background:
        canvas.setFillColor(colors.white)
        canvas.setStrokeColor(NAVY)
        canvas.setLineWidth(0.5)
        canvas.circle(x,y,5.9,fill=1,stroke=1)
    canvas.setFillColor(text_color)
    canvas.setFont("Helvetica-Bold",6.5)
    canvas.drawCentredString(x,y-2.2,text)

class PuzzleDiagram(Flowable):
    def __init__(self, kind, state, cube):
        Flowable.__init__(self)
        self.kind, self.state, self.cube = kind, state, cube
        self.width, self.height = 180, 130

    def draw(self):
        if self.kind == "2x2":
            self.draw_2x2()
        elif self.kind == "pyraminx":
            self.draw_pyra()
        else:
            self.draw_skewb()

    def draw_2x2(self):
        c=self.canv
        x0,y0,cell=18,8,18
        starts={"U":0,"D":4,"F":8,"B":12,"L":16,"R":20}
        net={"B":(1,0),"L":(0,1),"U":(1,1),"R":(2,1),"D":(3,1),"F":(1,2)}
        for face,start in starts.items():
            for k in range(4):
                face_col,face_row,local_col,local_row=cube_face_coords(face,k)
                x=x0+(face_col*2+local_col)*cell
                y=y0+((2-face_row)*2+(1-local_row))*cell
                set_fill(c,COLORS_2[str(self.state[start+k])])
                c.setLineWidth(0.35)
                c.rect(x,y,cell,cell,fill=1,stroke=1)
        for face,(col,row) in net.items():
            x=x0+col*2*cell
            y=y0+(2-row)*2*cell
            c.setStrokeColor(NAVY);c.setLineWidth(0.9)
            c.rect(x,y,2*cell,2*cell,fill=0,stroke=1)
            face_label(c,face,x+cell,y+cell)

    def draw_pyra(self):
        c=self.canv
        side=65
        height=side*0.8660254038
        bottom=(90.0,6.0)
        left=(90.0-side/2,6.0+height)
        right=(90.0+side/2,6.0+height)
        def reflect(point,a,b):
            dx,dy=b[0]-a[0],b[1]-a[1]
            ratio=((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)
            foot=(a[0]+ratio*dx,a[1]+ratio*dy)
            return (2*foot[0]-point[0],2*foot[1]-point[1])
        # This is the four-face edge-connected net from PyraminxStateViewer.
        triangles={
            "U":(left,bottom,right),
            "L":(reflect(left,right,bottom),right,bottom),
            "R":(reflect(right,bottom,left),bottom,left),
            "B":(reflect(bottom,left,right),left,right),
        }
        for face in ["U","L","R","B"]:
            vertices=triangles[face]
            inds=self.cube.face_indices[face]
            for idx in inds:
                st=self.cube.stickers[idx]
                i,j=st["i"],st["j"]
                def pt(a,b):
                    w=1-a/3-b/3
                    return (w*vertices[0][0]+a/3*vertices[1][0]+b/3*vertices[2][0],
                            w*vertices[0][1]+a/3*vertices[1][1]+b/3*vertices[2][1])
                if st["orientation"]=="up":
                    poly=[pt(i,j),pt(i+1,j),pt(i,j+1)]
                else:
                    poly=[pt(i+1,j),pt(i+1,j+1),pt(i,j+1)]
                set_fill(c,COLORS_P[str(self.state[idx])])
                p=c.beginPath();p.moveTo(*poly[0])
                for v in poly[1:]:p.lineTo(*v)
                p.close();c.setLineWidth(0.35);c.drawPath(p,fill=1,stroke=1)
            p=c.beginPath();p.moveTo(*vertices[0])
            for v in vertices[1:]:p.lineTo(*v)
            p.close();c.setStrokeColor(NAVY);c.setLineWidth(0.9);c.drawPath(p,fill=0,stroke=1)
            face_label(c,face,sum(v[0] for v in vertices)/3,sum(v[1] for v in vertices)/3)

    def draw_skewb(self):
        c=self.canv
        # Face placement and corner order match SkewbStateViewer.
        net={"U":(1,0),"L":(0,1),"F":(1,1),"R":(2,1),"B":(3,1),"D":(1,2)}
        order={
            "U":((-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)),
            "R":((1,1,1),(1,1,-1),(1,-1,-1),(1,-1,1)),
            "F":((-1,1,1),(1,1,1),(1,-1,1),(-1,-1,1)),
            "D":((-1,-1,1),(1,-1,1),(1,-1,-1),(-1,-1,-1)),
            "L":((-1,1,-1),(-1,1,1),(-1,-1,1),(-1,-1,-1)),
            "B":((1,1,-1),(-1,1,-1),(-1,-1,-1),(1,-1,-1)),
        }
        x0,y0,size=18,8,36
        for face,(col,row) in net.items():
            x=x0+col*size;y=y0+(2-row)*size
            mid=size/2;r=size*0.23
            c.setFillColor(colors.HexColor("#d8e0e5"))
            c.rect(x,y,size,size,fill=1,stroke=0)
            polygons=[
                [(x,y+size),(x+mid,y+mid+r),(x+mid-r,y+mid)],
                [(x+size,y+size),(x+mid+r,y+mid),(x+mid,y+mid+r)],
                [(x+size,y),(x+mid,y+mid-r),(x+mid+r,y+mid)],
                [(x,y),(x+mid-r,y+mid),(x+mid,y+mid-r)],
            ]
            for signs,points in zip(order[face],polygons):
                idx=self.cube.corner_lookup[(face,signs)]
                set_fill(c,COLORS_S[str(self.state[idx])])
                p=c.beginPath();p.moveTo(*points[0])
                for v in points[1:]:p.lineTo(*v)
                p.close();c.setLineWidth(0.45);c.drawPath(p,fill=1,stroke=1)
            center_idx=self.cube.center_index_by_face[face]
            set_fill(c,COLORS_S[str(self.state[center_idx])])
            p=c.beginPath();p.moveTo(x+mid,y+mid+r)
            for v in [(x+mid+r,y+mid),(x+mid,y+mid-r),(x+mid-r,y+mid)]:p.lineTo(*v)
            p.close();c.setLineWidth(0.5);c.drawPath(p,fill=1,stroke=1)
            c.setStrokeColor(NAVY);c.setLineWidth(0.9)
            c.rect(x,y,size,size,fill=0,stroke=1)
            center_color=str(self.state[center_idx])
            label_color=colors.white if center_color in ("B","R") else NAVY
            face_label(c,face,x+mid,y+mid,background=False,text_color=label_color)

def inv_token(t, order):
    if order==3:
        if t.endswith("2'"): return t[:-2]
        if t.endswith("2"): return t[:-1]+"'"
    if t.endswith("'"): return t[:-1]
    if t.endswith("2"): return t
    return t+"'"

def inverted(seq, order):
    return [inv_token(x,order) for x in reversed(seq)]

def cube_move(c,t):
    c.make_move(" "+t+(" " if not t.endswith(("'","2")) else ""))

def case_card(kind, name, alg, state, cube, note, source):
    left=PuzzleDiagram(kind,state,cube)
    right=[P(name,"case"),P(" ".join(alg),"alg"),P(note,"small"),P(source,"tiny")]
    t=Table([[left,right]],colWidths=[190,315],hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),PALE),
        ("BOX",(0,0),(-1,-1),0.6,LINE),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),8),
        ("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),8),
        ("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    return t

def add_cards(story,cards,perpage=4):
    for i,card in enumerate(cards):
        story += [card,Spacer(1,9)]
        if (i+1)%perpage==0 and i+1<len(cards):
            story.append(PageBreak())

def source_line(story,label,url):
    story.append(P(f'<link href="{url}" color="#205b89">{label}</link>',"small"))

def new_doc(path, label, story):
    doc=SimpleDocTemplate(str(path),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=42,bottomMargin=51,
        title=label,author="Kousuke Uematsu",subject="Advanced small-puzzle case recognition and lookahead")
    doc.build(story,onFirstPage=lambda c,d:footer(c,d,label),onLaterPages=lambda c,d:footer(c,d,label))

def build_2x2():
    c=Rubiks_3(size=2,RegisterMyperms=False,PointReindex=False)
    solved_bottom=[frozenset(c.state_0[list(c.corner_index[k])]) for k in range(4,8)]
    rows=json.loads((ROOT/"assets/data/advanced-small-puzzles/2x2.json").read_text())["cases"]
    story=[]
    title(story,"2x2 上級手順書","CLL / EG-1 / EG-2　|　ケース認識・ピース追跡・先読み")
    section(story,"この冊子の使い方","最初の面を作る段階で下面4コーナーの並びを判定し、最後の層の形を予測する。ケース図は掲載手順の逆手順を完成状態に適用して作成した。展開図はportfolioのStateViewerと同じ配置で、Uの上にB、左にL、右にR、その右にD、下にFを置く。共有する辺を折り上げると立方体になる。")
    section(story,"1　記法と解法選択","U/D/F/B/L/Rは各面を外側から見た90°時計回り。' は反時計回り、2は180°。手順は左から右へ実行する。下面が完全なlayerならCLL、同色faceで下面の2個が隣接交換ならEG-1、対角交換ならEG-2を選ぶ。まず下面の単色だけで判断せず、側面のバーを確認する。")
    section(story,"2　3x3との接続","上面の向きの7群（Sune、Antisune、H、L、Pi、T、U）は3x3のOLL認識に近い。2x2ではエッジがないため、同じ向きでも側面のコーナー色の並びを追加で見る。CLLは3x3のCOLLに目的が近いが、2x2では下面の完成が前提。EGでは下面が未完成のままなので、OLLの見た目だけで手順を選ばない。")
    section(story,"3　練習メニュー","1) inspectionで下面faceの候補を2つ探す。2) 最初の面を作る手を頭で再生し、最後の層のU色位置を予測する。3) 図を3秒見て、上面の向き→側面のバー→下面の交換を口頭で言う。4) 手順を伏せて予測し、実機またはビューアで照合する。5) 手順中は次のスクランブルではなく、終わる前のAUFを先読みする。")
    section(story,"数え方と図の読み方","本図鑑はCubingApp掲載の非自明40件ずつ、合計120件。42件ずつとする資料もある。図鑑の手順は資料の面名をU/D軸まわりに再配向した同型手順なので、元資料の文字列とは異なる。ケース名は資料との照合キー。図内の面ラベルと共有辺を見て向きを確認する。下面の単色、交換型、往復完成を全件検証した。")
    story.append(PageBreak())
    cards=[]
    checked=0
    for i,row in enumerate(rows):
        alg=row["algorithm"]
        assert row["setup"]==inverted(alg,4),row["caseId"]
        c.reset()
        for move in inverted(alg,4):cube_move(c,move)
        state=c.state.copy()
        assert all(x==c.state_0[4] for x in state[4:8]),(row["caseId"],"D face")
        bottom=tuple(solved_bottom.index(frozenset(state[list(c.corner_index[k])])) for k in range(4,8))
        moved=[k for k in range(4) if bottom[k]!=k]
        group=row["caseId"].split()[0]
        if group=="CLL":
            assert not moved,(row["caseId"],bottom)
        elif group=="EG1":
            assert len(moved)==2 and (moved[0]-moved[1])%4 in (1,3),(row["caseId"],bottom)
        else:
            assert len(moved)==2 and (moved[0]-moved[1])%4==2,(row["caseId"],bottom)
        for move in alg:cube_move(c,move)
        assert all(c.state==c.state_0),row["caseId"]
        checked+=1
        directions={(0,0):"左上",(1,0):"右上",(0,1):"左下",(1,1):"右下"}
        top_positions=[directions[cube_face_coords("U",k)[2:]] for k in range(4) if state[k]==c.state_0[0]]
        bases={"F":8,"R":20,"B":12,"L":16}
        bars=[]
        for face,base in bases.items():
            top_stickers=[base+k for k in range(4) if cube_face_coords(face,k)[3]==0]
            if state[top_stickers[0]]==state[top_stickers[1]]:
                bars.append(face)
        swap="完成" if not moved else "↔".join(directions[cube_face_coords("D",k)[2:]] for k in moved)
        note=f"認識: U色の位置 {','.join(top_positions) or 'なし'}。側面上段バー {','.join(bars) or 'なし'}。D面 {swap}。"
        cards.append(case_card("2x2",row["caseId"],alg,state,c,note,"検証: 逆手順で図を作成 → 掲載手順で完成"))
    section(story,"4　全ケース図鑑","各カードは6面を共有辺で接続した同一状態の展開図。見えない側面を頭の中で折り上げる練習に使う。")
    add_cards(story,cards,4)
    story.append(PageBreak())
    section(story,"5　先読み演習","A. ケース図のF面とR面だけを見て、隠れたL/B面の色の候補を絞る。B. 手順の最初の3手を実行する前に、追うコーナー1個の移動先を予測する。C. 同じ向き群からCLL・EG-1・EG-2を各1件選び、下面だけを変えたときの解法選択を比較する。D. 一日に1群だけ、認識時間と実行時間を別々に記録する。")
    section(story,"アプリ化のためのケースデータ","各カードは puzzleId=2x2、caseId、notation、setup（掲載手順の逆）、algorithm、focusPieces、source を持つ独立データとして扱える。既存のcubing.js再生ページは維持し、独自ビューアのPuzzleDefinition拡張時に同じ状態データを渡す。")
    section(story,"出典・検証","ケース名と基礎手順はCubingApp。分類と手順数の別表記はJ Perm。図と教材用の再配向は本冊子で作成し、portfolioの2x2状態遷移で全件を往復検証した。最短手数や指使いの優劣は検証範囲外。")
    source_line(story,"CubingApp: CLL","https://cubingapp.com/algorithms/2x2-CLL")
    source_line(story,"CubingApp: EG1","https://cubingapp.com/algorithms/2x2-EG1")
    source_line(story,"CubingApp: EG2","https://cubingapp.com/algorithms/2x2-EG2")
    source_line(story,"J Perm: faster 2x2","https://www.jperm.net/2x2/faster")
    path=ROOT/"output/pdf/2x2_advanced_casebook.pdf"
    new_doc(path,"2x2 ADVANCED",story)
    return checked,path

def build_pyra():
    c=PyraminxCube()
    rows=json.loads((ROOT/"assets/data/advanced-small-puzzles/pyraminx.json").read_text())["cases"]
    story=[]
    title(story,"ピラミンクス上級手順書","V字構築 / L4E / 解法選択　|　35ケース図鑑")
    section(story,"1　記法","U/L/R/Bは各頂点を正面から見た大きな層の120°時計回り。' は逆方向。u/l/r/bは先端チップだけを回す記号で、この図鑑の手順には含まない。手順は左から右へ実行。展開図はportfolioのStateViewerと同じく中央のU面の3辺にL・R・B面を接続した形で示す。")
    section(story,"2　V字を作りながら追う","一つの面の中心と2本のエッジを揃えるとV字になる。第一エッジだけを見るのではなく、第二エッジの位置・向き、残る4本の位置、最後のチップまでinspectionで確認する。V字の2手目を回す時点で、残る下エッジの正位置／反転を読み始める。")
    section(story,"3　解法の選択","V字が短く、残り4エッジをひとまとまりで認識できるならL4E。3本目の下エッジまで自然に揃うならL3Eへ還元。先に一面完成が極端に短い場合はLBLの最終層も比較する。最少手数だけでなく、持ち替えと見えない面の確認コストも選択基準にする。")
    section(story,"4　3x3との接続","Sune/Antisuneという名やR U R'の動きは3x3のOLL・sexy moveを思い出す助けになる。ただしピラミンクスは120°回転で、対象はエッジ。3x3の手順を字面だけ移植してはいけない。")
    section(story,"数え方と検証","この図鑑はCubingAppの5+6+8+8+8=35件。37件とする別資料もあり、AUF・対称形・L3Eへの還元の扱いが異なる。掲載手順はU頂点を固定した回転対称による教材用の同型手順。全件で逆手順から図を作り、掲載手順で完成することを検証した。")
    story.append(PageBreak())
    cards=[];checked=0
    for i,row in enumerate(rows):
        alg=row["algorithm"]
        assert row["setup"]==inverted(alg,3),row["caseId"]
        c.state=c.state_0.copy()
        for t in inverted(alg,3):c.state=c.state[c.move[t]]
        state=c.state.copy()
        for t in alg:c.state=c.state[c.move[t]]
        assert all(c.state==c.state_0),row["caseId"]
        checked+=1
        # The group is a recognition cue from the cited source, not inferred from the net.
        missing=[str(sum(state[idx]!=c.state_0[idx] for idx in c.face_indices[f])) for f in c.faces]
        note=f"認識群: {row['recognitionFamily']}。U/L/R/Bの異色ステッカー数 {','.join(missing)}。下エッジの位置・向きを優先。"
        cards.append(case_card("pyraminx",row["caseId"],alg,state,c,note,"検証: 逆手順で図を作成 → 掲載手順で完成"))
    section(story,"5　L4E全ケース図鑑","4面の色配置を見て、自分で選んだV字の基準面と照合する。名称は元資料の索引であり、教材の図は再配向した状態。")
    add_cards(story,cards,4)
    story.append(PageBreak())
    section(story,"6　先読み演習","A. V字の第一エッジを置く前に第二エッジの位置を指で示す。B. V字完成の2手前でL4E分類を予告する。C. 同一スクランブルで3色のV字候補を列挙し、総手数・持ち替え・認識負荷を比較する。D. 手順末尾のU調整とチップを実行前に言う。E. 1日5ケースを図だけで判別し、誤認の原因を「位置」「向き」「見えない面」に分類する。")
    section(story,"出典・検証","CubingAppのケース分類と手順、Cubing ProのV first説明を参照。図と再配向は本冊子で作成し、portfolioのピラミンクス状態遷移で35件を往復検証した。")
    source_line(story,"CubingApp: Pyraminx L4E","https://cubingapp.com/algorithms/Pyraminx-L4E")
    source_line(story,"Cubing Pro: V first / L4E","https://www.cubingpro.com/static/cubingpro.com_pyraminx_v_first_alg.pdf")
    source_line(story,"Speedsolving Wiki: V First","https://www.speedsolving.com/wiki/index.php/V_First")
    path=ROOT/"output/pdf/pyraminx_advanced_casebook.pdf"
    new_doc(path,"PYRAMINX ADVANCED",story)
    return checked,path

def build_skewb():
    c=SkewbCube()
    story=[]
    title(story,"スキューブ上級手順書","Advanced Sarah / NS　|　記法・認識・状態演習")
    section(story,"1　この冊子の記法","白を上、緑を手前に持つ。WCA方式のR/U/L/Bは、それぞれDRB/ULB/DFL/DBLの頂点を回す。対角線反対側の頂点はoR/oU/oL/oB（UFL/DFR/UBR/URF）と表す。oはoppositeの略。各頂点を外側から見て120°時計回り、' は逆方向。旧データの3面表記も入力できる。3x3のF/L/R面回転や、SarahのF/L/R層、FCN、NSの1文字記法とは別物として扱う。展開図はportfolioのStateViewerと同じくUをFの上、DをFの下、L/F/R/Bを横一列に置き、共有辺で接続する。")
    section(story,"2　Advanced Sarah","Sarah Strongの原著では、まず一面を完成し、残りを一段階で処理するAdvanced Variationを134ケースとして整理する。認識は「残るコーナーの向きと並び → 上面中心 → 側面中心」の順に行う。原著はS/H（sledgehammer / hedgeslammer）を基本単位としており、3x3の同名トリガーと発想は結びつく。ただし回転軸と文字の定義が異なるため手順をそのまま転用しない。")
    section(story,"3　NSの位置づけ","NSは最終段階を高速化するための別手順体系として参照する。Sarah Advancedと同じ見た目のケースでも記法と手順索引が異なる。NS2 Trainerは131と表示するが、Sarahの134と一対一対応する件数だとは解釈しない。まずSarahの認識軸で状態を説明できるようにし、その後NSの手順を状態単位で追加する。")
    section(story,"4　代表ケースの観察手順","一面完成後に上側コーナーの向きを数え、同じ色のバーの位置を見る。次に上面中心が正位置かを確認し、最後に側面中心の交換を追う。図を見て3条件を言語化できてから手順を選ぶ。以下はportfolioの回転定義で検証した状態演習であり、Sarah/NS原表のケースIDへは換算していない。")
    story.append(PageBreak())
    notes=[
        "4手の交換構造。動く中心と不動の中心を追う。",
        "S型と順序を比較し、同じ角が戻るかを観察。",
        "中心だけを追い、最初の4手後に行き先を予測。",
        "Aとの中心移動の差を比較。",
        "一つのコーナーだけを物理ピースとして追跡。",
        "2手ずつ区切り、バーの発生位置を予測。",
    ]
    exercises=json.loads((ROOT/"assets/data/advanced-small-puzzles/skewb.json").read_text())["cases"]
    cards=[];checked=0
    for row,note in zip(exercises,notes):
        name,alg=row["caseId"],[c.normalize_move_key(move) for move in row["algorithm"]]
        assert [c.normalize_move_key(move) for move in row["setup"]]==inverted(alg,3),name
        state=c.state_0.copy()
        for t in inverted(alg,3):state=state[c.move[t]]
        test=state.copy()
        for t in alg:test=test[c.move[t]]
        assert all(test==c.state_0),name
        checked+=1
        cards.append(case_card("skewb",name,alg,state,c,note,"検証済み状態演習 / Sarah・NSのケース番号は未割当"))
    section(story,"5　状態演習","図は演習手順の逆手順から生成。6面を見て、手順を始める前に動く中心・コーナーを推測する。")
    add_cards(story,cards,3)
    story.append(PageBreak())
    section(story,"6　先読み演習","A. 第一面を最後の1手で揃える直前に、反対面のコーナー向きと上面中心を予告する。B. 図のU/F/Rだけを見て残り3面の候補を絞る。C. 4手トリガーを1手ずつ止め、中心とコーナーを別々に追う。D. Sarahの分類で状態を記述してからNS資料を開き、同じ実状態に対応する手順だけを採用する。E. 新しいNS手順を追加する前に、逆手順でケース図を作り往復完成を確認する。")
    section(story,"原表と教材化の境界","Sarah原表は134ケース。NSには複数の版・記法がある。本版は原表の全134手順とNS手順の記法換算を完了していないため、未検証の文字列を正解として並べない。次のアプリ実装では、caseId、使用記法、初期状態、手順、回転軸、参照元を明示し、同じ実状態への到達を自動検査する。")
    section(story,"出典・検証","Advanced Sarahの構造と134件は開発者Sarah Strongの資料。NS記法はCubing Pro、ケース索引の比較はCubingAppとNS2 Trainer。状態演習6件はユーザーのportfolio実装にある手順から作り、portfolioのスキューブ状態遷移で往復検証した。")
    source_line(story,"Sarah Strong: Sarah's Method","https://sarah.cubing.net/skewb/my-method")
    source_line(story,"Sarah Strong: Advanced Variation by case","https://sarah.cubing.net/skewb/advanced-variation-by-case.pdf")
    source_line(story,"Cubing Pro: notation and Sarah Advanced","https://cubingpro.com/skewb/sarah_advanced")
    source_line(story,"CubingApp: Sarah Advanced","https://cubingapp.com/algorithms/Sarah-Advanced")
    source_line(story,"NS2 Trainer","https://mihlefeld.github.io/Skewb-NS2-Trainer/")
    path=ROOT/"output/pdf/skewb_advanced_casebook.pdf"
    new_doc(path,"SKEWB ADVANCED",story)
    return checked,path

def main():
    (ROOT/"output/pdf").mkdir(parents=True,exist_ok=True)
    for fn in [build_2x2,build_pyra,build_skewb]:
        n,path=fn()
        print(f"{path}: {n} roundtrip-checked cases")

if __name__=="__main__":
    main()
