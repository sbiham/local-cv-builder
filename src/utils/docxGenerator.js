import { Document, Paragraph, TextRun, Packer, BorderStyle, AlignmentType, ExternalHyperlink } from "docx";

/**
 * Generates a styled DOCX blob from the structured CV data.
 * @param {object} data - Structured CV data.
 * @returns {Promise<Blob>} The generated DOCX file blob.
 */
export async function generateDocx(data) {
  // 1. Process and assemble contact details row dynamically using TextRun and ExternalHyperlink
  const contactChildren = [];

  if (data.phone && data.phone.trim()) {
    contactChildren.push(
      new TextRun({
        text: data.phone.trim(),
        color: "0b5394",
        font: "Lato",
        size: 21 // 10.5pt
      })
    );
  }

  if (data.email && data.email.trim()) {
    if (contactChildren.length > 0) {
      contactChildren.push(
        new TextRun({
          text: "     •     ",
          color: "0b5394",
          font: "Lato",
          size: 21
        })
      );
    }
    contactChildren.push(
      new TextRun({
        text: data.email.trim(),
        color: "0b5394",
        font: "Lato",
        size: 21
      })
    );
  }

  if (data.location && data.location.trim()) {
    if (contactChildren.length > 0) {
      contactChildren.push(
        new TextRun({
          text: "     •     ",
          color: "0b5394",
          font: "Lato",
          size: 21
        })
      );
    }
    contactChildren.push(
      new TextRun({
        text: data.location.trim(),
        color: "0b5394",
        font: "Lato",
        size: 21
      })
    );
  }

  if (data.linkedin && data.linkedin.trim()) {
    if (contactChildren.length > 0) {
      contactChildren.push(
        new TextRun({
          text: "     •     ",
          color: "0b5394",
          font: "Lato",
          size: 21
        })
      );
    }
    const linkedinUrl = data.linkedin.trim().startsWith('http') 
      ? data.linkedin.trim() 
      : `https://${data.linkedin.trim()}`;
      
    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: "Linkedin",
            color: "0b5394",
            font: "Lato",
            size: 21,
            underline: {}
          })
        ],
        link: linkedinUrl
      })
    );
  }

  if (data.github && data.github.trim()) {
    if (contactChildren.length > 0) {
      contactChildren.push(
        new TextRun({
          text: "     •     ",
          color: "0b5394",
          font: "Lato",
          size: 21
        })
      );
    }
    const githubUrl = data.github.trim().startsWith('http') 
      ? data.github.trim() 
      : `https://${data.github.trim()}`;

    contactChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: "Github",
            color: "0b5394",
            font: "Lato",
            size: 21,
            underline: {}
          })
        ],
        link: githubUrl
      })
    );
  }

  // 2. Build the children components
  const children = [];

  // Name & Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: data.name || 'Your Name',
          bold: true,
          size: 60, // 30pt
          font: "Lato"
        }),
        new TextRun({
          text: "  ",
          bold: true,
          size: 34, // 17pt
          font: "Lato"
        }),
        new TextRun({
          text: data.title || 'Professional Title',
          color: "c2410c", // Template Highlight Orange
          size: 36, // 18pt
          font: "Lato"
        })
      ],
      spacing: { after: 100 }
    })
  );

  // Contact line
  if (contactChildren.length > 0) {
    children.push(
      new Paragraph({
        children: contactChildren,
        spacing: { after: 150 }
      })
    );
  }

  // Summary Paragraph
  if (data.summary) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.summary,
            color: "0b5394",
            font: "Lato",
            size: 24 // 12pt
          })
        ],
        spacing: { after: 100 }
      })
    );
  }

  // Helper to create Section Headers with bottom horizontal line
  const addSectionHeader = (title) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 24, // 12pt
            font: "Raleway"
          })
        ],
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6, // 3/4 pt line
            space: 3,
            color: "333333"
          }
        },
        spacing: { before: 100, after: 120 }
      })
    );
  };

  // Experience Section
  if (data.experience && data.experience.length > 0) {
    addSectionHeader("Experience");
    
    data.experience.forEach(job => {
      if (!job.organization && !job.role) return;
      
      // Job title and dates row
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: (job.organization || 'Company') + " / ",
              bold: true,
              font: "Lato",
              size: 22 // 11pt
            }),
            new TextRun({
              text: (job.role || 'Role') + ", ",
              font: "Lato",
              size: 22
            }),
            new TextRun({
              text: job.dates || 'Dates',
              color: "666666", // Grey dates matching template
              font: "Lato",
              size: 22
            })
          ],
          spacing: { before: 80, after: 60 }
        })
      );

      // Bullet points
      if (job.bullets && job.bullets.length > 0) {
        job.bullets.forEach(bullet => {
          if (!bullet.trim()) return;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bullet.trim(),
                  font: "Lato",
                  size: 21 // 10.5pt
                })
              ],
              bullet: {
                level: 0
              },
              spacing: { after: 50 }
            })
          );
        });
      }
    });
  }

  // Education Section
  if (data.education && data.education.length > 0) {
    addSectionHeader("Education");

    data.education.forEach(edu => {
      if (!edu.organization && !edu.role) return;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: (edu.role || 'Degree') + " / ", // Degree/study first matching template
              bold: true,
              font: "Lato",
              size: 22
            }),
            new TextRun({
              text: (edu.organization || 'Institution') + ", ",
              font: "Lato",
              size: 22
            }),
            new TextRun({
              text: edu.dates || 'Dates',
              color: "666666",
              font: "Lato",
              size: 22
            })
          ],
          spacing: { before: 80, after: 60 }
        })
      );

      if (edu.bullets && edu.bullets.length > 0) {
        edu.bullets.forEach(bullet => {
          if (!bullet.trim()) return;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bullet.trim(),
                  font: "Lato",
                  size: 21
                })
              ],
              bullet: {
                level: 0
              },
              spacing: { after: 50 }
            })
          );
        });
      }
    });
  }

  // Skills Section
  if (data.skills && data.skills.length > 0) {
    // Filter empty skill categories
    const activeSkills = data.skills.filter(s => s.category.trim() && s.items.trim());
    if (activeSkills.length > 0) {
      addSectionHeader("Tech Skills");

      activeSkills.forEach(skill => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: skill.category.trim() + ": ",
                bold: true,
                font: "Lato",
                size: 21
              }),
              new TextRun({
                text: skill.items.trim(),
                font: "Lato",
                size: 21
              })
            ],
            spacing: { after: 60 }
          })
        );
      });
    }
  }

  // Custom Sections Section
  if (data.customSections && data.customSections.length > 0) {
    data.customSections.forEach(section => {
      if (!section.title || !section.title.trim()) return;
      const activeItems = (section.items || []).filter(item => item.title && item.title.trim());
      if (activeItems.length > 0) {
        addSectionHeader(section.title.trim());
        
        activeItems.forEach(item => {
          const headerRuns = [
            new TextRun({
              text: item.title.trim(),
              bold: true,
              font: "Lato",
              size: 22
            })
          ];

          if (item.subtitle && item.subtitle.trim()) {
            headerRuns.push(
              new TextRun({
                text: " / " + item.subtitle.trim(),
                font: "Lato",
                size: 22
              })
            );
          }

          if (item.date && item.date.trim()) {
            headerRuns.push(
              new TextRun({
                text: ", " + item.date.trim(),
                color: "666666",
                font: "Lato",
                size: 22
              })
            );
          }

          children.push(
            new Paragraph({
              children: headerRuns,
              spacing: { before: 80, after: 60 }
            })
          );

          if (item.bullets && item.bullets.length > 0) {
            item.bullets.forEach(bullet => {
              if (!bullet.trim()) return;
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: bullet.trim(),
                      font: "Lato",
                      size: 21
                    })
                  ],
                  bullet: {
                    level: 0
                  },
                  spacing: { after: 50 }
                })
              );
            });
          }
        });
      }
    });
  }

  // Languages Section
  if (data.languages && data.languages.length > 0) {
    const activeLangs = data.languages.filter(l => l.name.trim());
    if (activeLangs.length > 0) {
      addSectionHeader("Languages");

      activeLangs.forEach(lang => {
        const langChildren = [
          new TextRun({
            text: lang.name.trim(),
            bold: true,
            font: "Lato",
            size: 21
          })
        ];

        if (lang.proficiency && lang.proficiency.trim()) {
          langChildren.push(
            new TextRun({
              text: ": " + lang.proficiency.trim(),
              font: "Lato",
              size: 21
            })
          );
        }

        children.push(
          new Paragraph({
            children: langChildren,
            spacing: { after: 60 }
          })
        );
      });
    }
  }

  // 3. Assemble document with A4 configuration
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 850,    // 15mm page margin
              bottom: 850,
              left: 850,
              right: 850
            }
          }
        },
        children: children
      }
    ]
  });

  // 4. Pack document into binary buffer (Blob)
  return await Packer.toBlob(doc);
}
