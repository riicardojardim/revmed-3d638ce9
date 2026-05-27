import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

const APROVADOS = [
  "Alexandre S. Alcântara","Alexia Renata Ferreia","Aline Cíntia Tavares Gomes","Aline de Oliveira Ribeiro","Alyne Silva Trindade","Amanda Hellen","Amanda Paes","Amanda Procópio de Sá","Ana Abgail Moreira","Ana Carolina Soares Silva","Ana Karolina Falavina","André Teixeira Siqueira","Andréia Silva Alves","Andressa Modesto G.","Angelica Santos","Anna Claudia Mascari","Anny Marielly Batista","Antônio Rocha dos Santos Filho","Barbara Sandy Cardozo","Beatriz Vital","Brenda Campos Rozin","Bruna Andressa Barrilari","Bruna Stefanny Mello","Bruno Ismael Cabanas","Camila Chalup Calmotti","Camila do Nascimento Rodrigues","Camila Pedrosa","Carla Ester de Souza","Carla Sucolotti","Clarissa Reis Almeida","Cristhian Herran G.","Cyntia Feitosa Secundo","Daniel Bustamente Torrez","Daniel Magno Mota","Daniele Velasques Grance","Dayane de Oliveira Talarico","Débora Melo Silva","Divina Maria Corrêa","Donys Perez Ramirez","Douglas de Oliveira F.","Eduarda Valencia B. Vieira","Elissandra Gomes Barreto","Erlem Priscila da Silva","Eurides Viana","Fabielle Merenca","Fernando Bernardo da Silva","Fernando Luiz da Silva","Flavio Silva de Mendonca","Frederico Jose de Aguiar","Gabriela da Rocha","Gabriela Fernandes Veloso","Gabriella C. Moraes","Gabrielly Messias de Araujo","Gary Alejandro Vaca","Gely Bianca C.","Giovanna Patricia","Giselma Rodrigues","Glecia Garcia Guidas","Graziela Monteiro","Guilherme Milani Lopes","Gyrlane Fernanda da Silva","Hainna Oliveira","Hugo Manuel C. Ferraz","Ingridy Kelly Gonçalves da Silva","Isaac Teixeira","Isadora Mirtes Soares Chaves","Isora Robaina Acosta","Iza Vitória Domingues","Jaqueline Pinto Silva","Jenifer Tchesi Rosa","Jessica Leão Cordeiro e Silva","Jesus Oliver Sarmiento","João Gabriel Alba","Joao P. Rios Miranda","Joao Vitor Dalmasio","José Cleones Furtado","José Mateus Fernandes Gomes","José Vitor Canguçu","Josiane Mateus do Nascimento","Joyce Elloá de V.","Júlia Gabriela D.","Júlia Resplandes Montelo","Jusiel da Rocha Santos","Karina Silva da Cruz Brito","Karine Evelyn","Karine Paola Paixao","Karla Karolina B Oliveira","Karoline Araujo Correia","Keila Carolaine Rodrigues","Kylier Luiz M. B.","Laila Rodrigues","Laise Caroline Sampaio","Lara Eduarda Zago","Lariessa Souza Ferreira","Larissa Coely Rodrigues N. Simões","Larissa Fiala Benevides","Larissa Galvao","Laura Damasceno Sousa","Leandro Moreira A.","Leidiane Sperandio da Silva","Letícia de Amorim Pereira Gomes","Lícia Maria Melo Carvalho","Lorena Ferreira Barbosa","Lucas Dias Alves","Lúcio Kazuo Soria","Luis Eugenio Dias","Luiz Felipe Oliveira F.","Luiza Strauss","Luma Veras Ivo","Mara Milena Aguero","Maressa Aparecida Vieira","Maria Belen","Maria Jose Pereira","Maria Olivia Rigobelo","Mariana Gobi","Mariana Weizemann","Marilice Winckler de Oliveira","Marina Furlaneto","Marina Rosa G. Catarxo","Martha Dark Matos","Mateus Bomfim P.","Matheus Parreira","Mayra Fernandes A.","Millena Lopes da Silva","Miriam Raquel A.","Moab Momenté Castanheira","Moyra Olivia Cotto","Murillo Jose de Oliveira","Natalia Fernandes","Natália Maria Neto Frazão","Natália Ribeiro Leoncio","Nicolas Henrique","Nicoli Drebes","Osvaldo Luiz Joia","Paola Andrea C. Perez","Patrick Rabelo","Paula Marcela Quintero","Pedro Emanuel Gadelha","Pedro Henrique da S. Leonel","Pedro Ivo Mota","Pedro Vitor Costa Pereira","Peterson Veras","Priscila G dos Santos","Priscilla Lacerda Moreira","Rafael Rosemberg","Rafaela Peixoto Fernandes","Raissa B. Passamani","Raphaela Dias Toledo","Rayane Samyra Riberiro","Rayssa Ynara Cruzado","Rebeca Xavier Silva","Regiany Costa","Renaldo Caron","Rhendrix Max","Ricardo Ossamu Shibata","Rusleidy Quevedo S.","Shadira Ley Bellido","Simon Lucas Bezerra","Tallytta S Vitorino Silva","Tamyrys Ramos","Tayane de Alencar","Tayna de Oliveira Silva","Taynara Azevedo","Thalia Gonçalves","Thiago Except","Thiago Paulinelly S. R.","Tiago A. Olszewski","Uislei Inacio de Melo","Urias J. Abreu","Vandilma Mendes","Victoria Martins Rocha","Vilson Jose de Abreu","Wallen Werklaenhg","Wanderllon de Sousa Santos","Yamila Soria González",
];

function splitRows(arr: string[], n: number) {
  const rows: string[][] = Array.from({ length: n }, () => []);
  arr.forEach((v, i) => rows[i % n].push(v));
  return rows;
}

const ROWS = splitRows(APROVADOS, 4);

function NameRow({
  items,
  reverse = false,
  duration = 80,
}: {
  items: string[];
  reverse?: boolean;
  duration?: number;
}) {
  const loop = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-2 sm:gap-3"
        style={{
          animation: `marquee-x ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {loop.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-[0.72rem] sm:px-4 sm:py-2 sm:text-sm font-medium text-foreground/90 ring-1 ring-white/[0.03] backdrop-blur-sm"
          >
            <GraduationCap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AprovadosMarquee() {
  return (
    <section className="relative py-14 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px]"
        style={{
          background:
            "radial-gradient(50% 80% at 50% 0%, color-mix(in oklab, var(--primary) 14%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <GraduationCap className="h-3.5 w-3.5" /> Aprovados • Revalida INEP 25.1
          </p>
          <h2 className="mt-3 font-display text-[1.7rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-5xl">
            +{APROVADOS.length} médicos aprovados <span className="text-primary">na 2ª etapa</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Cada nome aqui é um colega que conquistou o Revalida com a REVMED.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-2 sm:space-y-3 md:mt-12"
        >
          <NameRow items={ROWS[0]} duration={80} />
          <NameRow items={ROWS[1]} duration={95} reverse />
          <NameRow items={ROWS[2]} duration={85} />
          <NameRow items={ROWS[3]} duration={100} reverse />
        </motion.div>
      </div>
    </section>
  );
}