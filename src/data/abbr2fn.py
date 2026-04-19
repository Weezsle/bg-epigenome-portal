import os
import re
import sys
import json
import copy
import time
import gzip
import argparse

s = f"""ACx	allocortex
ADARB2	adenosine deaminase RNA specific B2 (inactive)
AMY	amygdaloid complex
Astro	astrocyte
Astrocyte	astrocyte
BAM	border-associated macrophage
BF	basal forebrain
BG	basal ganglia
BNST	bed nucleus of stria terminalis
CALB1	calbindin 1
CGE	caudal ganglionic eminence
CHODL	chondrolectin
Cholinergic	cholinergic neuron
CLMN	calmin
CN	cerebral nuclei
COP	committed oligodendrocyte precursor
CTXND1	cortexin domain containing 1
Cx	cerebral cortex
CXCL14	C-X-C motif chemokine ligand 14
ICj	Island of Calleja granule cell
Matrix MSN	medium spiny neuron, matrix
MSN	medium spiny neuron
NUDAP MSN	medium spiny neuron, neurochemically unique domains in the accumbens and putamen
Striosome MSN	medium spiny neuron, striosomal
Hybrid	hybrid
Matrix MSN	medium spiny neuron, matrix
MSN	medium spiny neuron
StrioMat Hybrid MSN	medium spiny neuron, matrix/striosomal hybrid
Striosome MSN	medium spiny neuron, striosomal
Dopa	dopaminergic neuron
EBF2	EBF transcription factor 2
Eca	peri-caudate ependymal and subependymal zone
Endo	endothelial cell
Epen	ependymal cell
Ependymal	ependymal cell
F	forebrain (prosencephalon)
FRMD7	FERM domain containing 7
FS	fast spiking neuron
GABA	GABAergic neuron
GAD2	glutamate decarboxylase 2
GATA3	GATA binding protein 3
GBX1	gastrulation brain homeobox 1
Glut	glutamatergic neuron
GP	globus pallidus
GPi	internal division of globus pallidus
Core	, medial (central) portion
Shell	, lateral (peripheral) portion
Granular	granule cell
HDC	histidine decarboxylase
Hist	histaminergic neuron
Hybrid	hybrid
ImAstro	immune astrocyte
Immune	leukocyte
ImOligo	immune oligodendrocyte
LAMP5	lysosomal associated membrane protein family member 5
LGE	lateral ganglionic eminence
LHX6	LIM homeobox 6
LHX8	LIM homeobox 8
Lymphocyte	lymphocyte
M	midbrain (mesencephalon)
Macrophage	macrophage
MEIS2	Meis homeobox 2
MGE	medial ganglionic eminence
Microglia	microglial cell
Monocyte	monocyte
NDB	nucleus of diagonal band
NK cells	natural killer cell
Nonneuron	non-neuronal cell
Oligo	oligodendrocyte
Oligodendrocyte	oligodendrocyte
ONECUT1	one cut homeobox 1
OPALIN	oligodendrocytic myelin paranodal and inner loop protein
OPC	oligodendrocyte precursor cell
OT	olfactory tubercle
OTX2	orthodenticle homeobox 2
PAX7	paired box 7
PAX8	paired box 8
Pericyte	pericyte
PITX2	paired like homeodomain 2
PLPP4	phospholipid phosphatase 4
POSTN	periostin
PTHLH	parathyroid hormone like hormone
PVALB	parvalbumin
RBFOX1	RNA binding fox-1 homolog 1
RSPO2	R-spondin 2
SEMA5A	semaphorin 5A
Sero	serotonergic neuron
SI	substantia innominata
SKOR1	SKI family transcriptional corepressor 1
SMC	smooth muscle cell
SN	substantia nigra
SOX6	SRY-box transcription factor 6
SST	somatostatin
ST18	ST18 C2H2C-type zinc finger transcription factor
STH	subthalamic nucleus
STK32A	serine/threonine kinase 32A
STR	striatum
STRd	dorsal striatum (caudoputamen complex-CP)
STRv	ventral striatum
Subpallium	subpallium
TAC3	tachykinin precursor 3
TCF7L2	transcription factor 7 like 2
THM	thalamus
Vascular	vascular system
VIP	vasoactive intestinal peptide
VLMC	vascular leptomeningeal cell
VTA	ventral tegmental area
GPe	external segment of globus pallidus
HTH	hypothalamus
LYPD6	LY6/PLAUR domain containing 6
GPin	interstitial cholinergic nucleus of globus pallidus
OB	olfactory bulb
PLEKHG1	pleckstrin homology and RhoGEF domain containing G1
SLEA	sublenticular extended amygdala
ZI	zona incerta
VTR	ventral tegmental region of midbrain
D1	D1
D2	D2
D1D2	D1/D2
Striosome	striosome
Matrix	matrix
StrioMat	striosome matrix
GRIN2A	GRIN2A
NRP2	NRP2
RORA	RORA
NUDAP	NUDAP"""


token_abrevations_to_fullnames = {}
for l in s.strip().split("\n"):
    # print(l)
    k, v = l.split("\t", 1)
    token_abrevations_to_fullnames[k] = v
    # print(k)

for i in range(1,5):
    token_abrevations_to_fullnames[str(i)] = str(i)


keywords = set()
with open("taxonomy.tsv") as f:

    for l in f:
        n, c, sc, g = l.strip().split("\t")

        line = [n, "neighborhood"]
        keywords.add(tuple(line))

        line = [c, "class"]
        keywords.add(tuple(line))

        line = [sc, "subclass"]
        keywords.add(tuple(line))

        line = [g, "group"]
        keywords.add(tuple(line))


def tear_down_string(text):
    # 1. Get Subwords
    # Split by space or hyphen.
    # The filter(None, ...) removes empty strings if separators are at the start/end.
    subwords = list(filter(None, re.split(r'[ -]', text)))

    # 2. Get Separators
    # Find all instances of a space OR a hyphen
    separators = re.findall(r'[ -]', text)
    separators += [""]

    ori = ""
    for s1, s2 in zip(subwords, separators):
        if s2 not in [" ", "-", ""]:
            raise RuntimeError
        ori += s1 + s2
    assert ori == text
    assert len(subwords) == len(separators)

    return subwords, separators


keywords = list(sorted(keywords))

with open("abbr2fn.tsv", "w") as f:
    for kw in keywords:
        line = list(kw)
        fn = ""

        issue = False
        subwords, separators = tear_down_string(kw[0])
        for s1, s2 in zip(subwords, separators):
            if s1 in token_abrevations_to_fullnames:
                fn += token_abrevations_to_fullnames[s1] + s2
            else:
                print(f"Cannot find full name for '{s1}'")
                issue = True

        if issue:
            if kw[0] in ["T cells", "B cells"]:
                print("Skipping...")
                continue


        line.append(fn)
        f.write("\t".join(line) + "\n")








