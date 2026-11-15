import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import { HomePanelLink } from "@/components/HomePager";
import { PageTransition } from "@/components/PageTransition";
import { TRANSITION } from "@/components/transitions";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "About Rhetor.",
};

/** What the Host does during a Session, in the order the Speaker meets it. */
const HOST_ROLES = [
  { title: "It listens", detail: "To every word, from your opening line to your last." },
  { title: "It watches", detail: "How you stand, move and gesture while you speak." },
  { title: "It asks questions", detail: "About what you said, the way an audience would." },
  { title: "It gives feedback", detail: "Out loud, on what to improve next time." },
];

/**
 * What the app is in the rail, and the Host's four roles two by two in the content field,
 * on the same 3 + 9 columns as the Modes panel on Home.
 */
export default function AboutPage() {
  return (
    <PageTransition>
      <div className="mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-4 gap-x-6 px-6 max-lg:grid-rows-[auto_auto_1fr_auto] sm:px-12 lg:grid-cols-12 lg:gap-x-8 lg:px-24">
        {/* On small screens the rail dissolves into the page, so the link can drop below the roles. */}
        <div className="max-lg:contents lg:sticky lg:top-0 lg:col-span-3 lg:flex lg:h-screen lg:flex-col lg:py-20">
          <Link
            href="/"
            transitionTypes={[TRANSITION.fromAbout]}
            className="col-span-4 block self-start pt-5 text-[1.75rem] font-bold leading-[0.92] tracking-tight font-display hover:text-mute lg:pt-0"
          >
            <Wordmark />
          </Link>
          <h1 className="sr-only">About Rhetor</h1>
          <p className="col-span-4 mt-6 max-w-[30ch] text-xl leading-[1.25] font-medium lg:mt-14">
            A practice room for speeches. Bring one you’ve prepared, or improvise on a random topic, and give it to an
            AI host.
          </p>
          <HomePanelLink
            panel="modes"
            transitionTypes={[TRANSITION.aboutToModes]}
            className="group col-span-4 flex items-center gap-4 self-start pb-6 text-xl font-bold outline-offset-4 max-lg:order-last lg:mt-auto lg:pb-0"
          >
            {/* Modes sits below and to the left of About. */}
            <Arrow angle={135} className="size-10 p-2 sm:size-11 sm:p-2.5" />
            Choose a mode
          </HomePanelLink>
        </div>

        <ul className="col-span-4 grid auto-rows-fr grid-cols-2 gap-x-6 py-8 lg:col-span-9 lg:gap-x-8 lg:py-20">
          {HOST_ROLES.map((role) => (
            <li key={role.title} className="border-t-2 border-ink pt-4 pb-10 lg:pb-12">
              <h2 className="text-[clamp(1.5rem,min(2.6vw,5.5vh),2.75rem)] font-bold leading-[0.95] tracking-[-0.035em] font-display">
                {role.title}
              </h2>
              <p className="mt-3 max-w-[28ch] text-base leading-snug text-mute sm:text-lg">{role.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  );
}
